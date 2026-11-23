"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, ShieldCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { GovernanceProposal } from "@/lib/api";
import { useKeyProposals } from "@/hooks/useCreatorKeys";
import { useAuth } from "@/hooks/useAuth";
import { VoteModal } from "@/components/keys/VoteModal";
import { CreateProposalModal } from "@/components/keys/CreateProposalModal";
import { GovernanceDelegationModal } from "@/components/keys/GovernanceDelegationModal";
import { GovernanceDelegationList } from "@/components/keys/GovernanceDelegationList";
import {
  calculateEffectiveVotingPower,
  loadStoredDelegations,
  revokeDelegation,
  saveStoredDelegations,
  type GovernanceDelegation,
} from "@/lib/governanceDelegation";

function useNow() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return now;
}

function formatCountdown(expiresAt: string, now: number): string {
  const remaining = new Date(expiresAt).getTime() - now;
  if (!Number.isFinite(remaining) || remaining <= 0) return "Expired";

  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);

  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m ${seconds}s remaining`;
}

function winningOption(proposal: GovernanceProposal): string {
  if (proposal.winning_option) return proposal.winning_option;
  if (typeof proposal.winning_option_index === "number") {
    return proposal.options[proposal.winning_option_index]?.label ?? "Unknown";
  }

  return proposal.options.reduce(
    (winner, option) =>
      option.vote_weight > winner.vote_weight ? option : winner,
    proposal.options[0] ?? { label: "Unknown", vote_weight: 0 }
  ).label;
}

interface ProposalCardProps {
  proposal: GovernanceProposal;
  isHolder: boolean;
  effectiveVotingPower?: number;
  onVote: (proposal: GovernanceProposal) => void;
  now: number;
}

function ProposalCard({
  proposal,
  isHolder,
  effectiveVotingPower,
  onVote,
  now,
}: ProposalCardProps) {
  const totalWeight = useMemo(
    () => proposal.options.reduce((sum, option) => sum + option.vote_weight, 0),
    [proposal.options]
  );
  const active = proposal.status === "active";

  return (
    <Card data-testid={`proposal-card-${proposal.id}`}>
      <CardHeader className="space-y-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold">{proposal.title}</h3>
            {active ? (
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {formatCountdown(proposal.expires_at, now)}
              </p>
            ) : (
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />
                Voting ended
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {active && isHolder && effectiveVotingPower !== undefined && (
              <Badge variant="secondary" className="text-xs" data-testid={`effective-power-badge-${proposal.id}`}>
                {effectiveVotingPower} effective votes
              </Badge>
            )}
            {active && isHolder && (
              <Button
                type="button"
                onClick={() => onVote(proposal)}
                disabled={proposal.user_has_voted}
                data-testid={`cast-vote-${proposal.id}`}
              >
                {proposal.user_has_voted ? "Voted" : "Cast Vote"}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {proposal.options.map((option) => {
          const percentage =
            totalWeight > 0 ? (option.vote_weight / totalWeight) * 100 : 0;

          return (
            <div key={option.label} className="space-y-2">
              <div className="flex justify-between gap-3 text-sm">
                <span className="font-medium">{option.label}</span>
                <span className="text-muted-foreground">
                  {option.vote_weight.toLocaleString()} votes
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${percentage}%` }}
                  aria-label={`${option.label} ${percentage.toFixed(1)} percent`}
                />
              </div>
            </div>
          );
        })}

        {!active && (
          <div className="rounded-md bg-muted p-3 text-sm">
            <span className="text-muted-foreground">Winning option: </span>
            <span className="font-semibold">{winningOption(proposal)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface GovernanceTabProps {
  keyId: string;
  isHolder: boolean;
  isCreator?: boolean;
  holderBalance?: number;
  whitelistEnabled?: boolean;
}

export function GovernanceTab({
  keyId,
  isHolder,
  isCreator,
  holderBalance = 0,
  whitelistEnabled = false,
}: GovernanceTabProps) {
  const [status, setStatus] = useState<"active" | "closed">("active");
  const [selectedProposal, setSelectedProposal] =
    useState<GovernanceProposal | null>(null);
  const [delegationModalOpen, setDelegationModalOpen] = useState(false);
  const { address, jwt } = useAuth();
  const now = useNow();
  const { data, isLoading } = useKeyProposals(keyId, status, jwt);
  const proposals = data?.proposals ?? [];

  // Local delegations state
  const [delegations, setDelegations] = useState<GovernanceDelegation[]>(() =>
    loadStoredDelegations(keyId)
  );

  useEffect(() => {
    saveStoredDelegations(keyId, delegations);
  }, [keyId, delegations]);

  const userAddr = address ?? "";

  const outgoing = useMemo(
    () => delegations.filter((d) => d.delegatorAddress === userAddr),
    [delegations, userAddr]
  );

  const incoming = useMemo(
    () => delegations.filter((d) => d.delegateAddress === userAddr),
    [delegations, userAddr]
  );

  const votingSummary = useMemo(
    () =>
      calculateEffectiveVotingPower(
        holderBalance,
        outgoing,
        incoming,
        now
      ),
    [holderBalance, outgoing, incoming, now]
  );

  const handleDelegationCreated = (newDel: GovernanceDelegation) => {
    setDelegations((prev) => [...prev, newDel]);
  };

  const handleRevoke = (id: string) => {
    setDelegations((prev) => revokeDelegation(id, prev, Date.now()));
  };

  return (
    <div className="space-y-6" data-testid="governance-tab-content">
      {/* Voting Power & Delegation Summary Card */}
      {isHolder && userAddr && (
        <Card data-testid="voting-power-card">
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  Held Keys (100% Custody)
                </p>
                <p className="text-xl font-bold" data-testid="base-held-keys">
                  {votingSummary.baseWeight.toLocaleString()}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Delegated Away</p>
                <p className="text-xl font-bold text-amber-600" data-testid="delegated-out-power">
                  -{votingSummary.delegatedOutWeight.toLocaleString()}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Delegated Received</p>
                <p className="text-xl font-bold text-emerald-600" data-testid="delegated-in-power">
                  +{votingSummary.delegatedInWeight.toLocaleString()}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  Effective Voting Power
                </p>
                <p className="text-xl font-bold text-primary" data-testid="effective-voting-power">
                  {votingSummary.effectiveWeight.toLocaleString()} votes
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delegation Manager Section */}
      {isHolder && userAddr && (
        <GovernanceDelegationList
          keyId={keyId}
          userAddress={userAddr}
          delegations={delegations}
          onRevoke={handleRevoke}
          onOpenNewDelegation={() => setDelegationModalOpen(true)}
        />
      )}

      {/* Proposals Header */}
      <div className="flex items-center justify-between gap-2 pt-2">
        <div className="flex gap-2">
          <Button
            type="button"
            variant={status === "active" ? "default" : "outline"}
            onClick={() => setStatus("active")}
          >
            Active
          </Button>
          <Button
            type="button"
            variant={status === "closed" ? "default" : "outline"}
            onClick={() => setStatus("closed")}
          >
            Closed
          </Button>
        </div>
        {isCreator && <CreateProposalModal keyId={keyId} />}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      ) : proposals.length === 0 ? (
        <Card data-testid="governance-empty-state">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No {status} proposals exist for this key.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {proposals.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              isHolder={Boolean(address && jwt && isHolder)}
              effectiveVotingPower={votingSummary.effectiveWeight}
              onVote={setSelectedProposal}
              now={now}
            />
          ))}
        </div>
      )}

      <VoteModal
        keyId={keyId}
        proposal={selectedProposal}
        open={selectedProposal !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedProposal(null);
        }}
        effectiveWeightOverride={votingSummary.effectiveWeight}
      />

      {isHolder && userAddr && (
        <GovernanceDelegationModal
          keyId={keyId}
          userAddress={userAddr}
          availableKeys={holderBalance}
          whitelistEnabled={whitelistEnabled}
          open={delegationModalOpen}
          onOpenChange={setDelegationModalOpen}
          onDelegationCreated={handleDelegationCreated}
        />
      )}
    </div>
  );
}
