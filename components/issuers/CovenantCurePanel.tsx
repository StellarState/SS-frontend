"use client";

/**
 * Issuer covenant breach proposal and cure flow panel (#684).
 *
 * Implements breach evidence and cure proposal forms (waiver, extension, restructuring),
 * principal-weighted investor voting, quorum and approval progress bars,
 * finalization locks, and the covenant audit timeline.
 */

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  FileText,
  Vote,
  TrendingUp,
  Loader2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  validateCureProposal,
  calculateVotingProgress,
  castPrincipalWeightedVote,
  type CovenantBreach,
  type CureProposal,
  type CovenantTimelineEvent,
  type CureType,
} from "@/lib/analytics/covenantCure";
import {
  useCovenantBreach,
  useCureProposals,
  useCovenantTimeline,
  useCreateCureProposalMutation,
  useCastVoteMutation,
} from "@/hooks/useCovenantCure";

function formatAmount(n: number) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── Main Panel ─────────────────────────────────────────────────────────────

interface CovenantCurePanelProps {
  invoiceId: string;
  walletAddress: string | null | undefined;
  eligiblePrincipal?: number;
  breachOverride?: CovenantBreach | null;
  proposalsOverride?: CureProposal[];
  timelineOverride?: CovenantTimelineEvent[];
}

export function CovenantCurePanel({
  invoiceId,
  walletAddress,
  eligiblePrincipal = 25000,
  breachOverride,
  proposalsOverride,
  timelineOverride,
}: CovenantCurePanelProps) {
  const { data: fetchedBreach, isLoading: isBreachLoading } = useCovenantBreach(invoiceId);
  const { data: fetchedProposals, isLoading: isProposalsLoading } = useCureProposals(invoiceId);
  const { data: fetchedTimeline } = useCovenantTimeline(invoiceId);

  const breach = breachOverride !== undefined ? breachOverride : fetchedBreach;
  const proposals = proposalsOverride ?? fetchedProposals ?? [];
  const timeline = timelineOverride ?? fetchedTimeline ?? [];

  const [isCreatingProposal, setIsCreatingProposal] = useState(false);

  // Proposal Form State
  const [cureType, setCureType] = useState<CureType>("extension");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [extensionDays, setExtensionDays] = useState("30");
  const [waiverFee, setWaiverFee] = useState("0");
  const [restructureYield, setRestructureYield] = useState("14.0");
  const [votingDays, setVotingDays] = useState("7");
  const [evidenceUrl, setEvidenceUrl] = useState("");

  const createMutation = useCreateCureProposalMutation(invoiceId, walletAddress);
  const voteMutation = useCastVoteMutation(invoiceId);

  if (isBreachLoading && breachOverride === undefined) {
    return (
      <Card data-testid="covenant-loading">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Loading covenant status...
        </CardContent>
      </Card>
    );
  }

  if (!breach) {
    return (
      <Card data-testid="covenant-no-breach">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No covenant breaches recorded for this invoice. Covenants are fully compliant.
        </CardContent>
      </Card>
    );
  }

  const isIssuer =
    Boolean(walletAddress) &&
    walletAddress?.trim().toLowerCase() === breach.issuer_address.trim().toLowerCase();

  const validation = validateCureProposal(
    {
      breach_id: breach.id,
      cure_type: cureType,
      title,
      description,
      proposed_terms: {
        extension_days: parseInt(extensionDays, 10) || undefined,
        waiver_fee_xlm: parseFloat(waiverFee) || 0,
        new_yield_rate: parseFloat(restructureYield) || undefined,
      },
      voting_duration_days: parseInt(votingDays, 10) || 7,
    },
    breach,
    walletAddress,
  );

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validation.isValid) return;

    createMutation.mutate(
      {
        breach_id: breach.id,
        cure_type: cureType,
        title,
        description,
        proposed_terms: {
          extension_days: cureType === "extension" ? parseInt(extensionDays, 10) : undefined,
          waiver_fee_xlm: cureType === "waiver" ? parseFloat(waiverFee) : undefined,
          new_yield_rate: cureType === "restructuring" ? parseFloat(restructureYield) : undefined,
        },
        evidence_urls: evidenceUrl ? [evidenceUrl] : [],
        voting_duration_days: parseInt(votingDays, 10) || 7,
      },
      {
        onSuccess: () => {
          setIsCreatingProposal(false);
          setTitle("");
          setDescription("");
          setEvidenceUrl("");
        },
      },
    );
  };

  const handleVote = (proposal: CureProposal, vote: "for" | "against") => {
    if (!walletAddress) return;
    try {
      // Validate in-memory guard
      castPrincipalWeightedVote(proposal, walletAddress, vote, eligiblePrincipal);
      voteMutation.mutate({
        proposalId: proposal.id,
        voterAddress: walletAddress,
        vote,
        eligiblePrincipal,
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <Card className="space-y-6 p-6" data-testid="covenant-cure-panel">
      {/* Breach Alert Header */}
      <div
        className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 space-y-2"
        data-testid="breach-alert-banner"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <span className="font-bold text-base text-foreground" data-testid="covenant-title">
              {breach.covenant_name}
            </span>
            <Badge
              variant={
                breach.status === "in_breach"
                  ? "destructive"
                  : breach.status === "cure_proposed"
                    ? "outline"
                    : "default"
              }
              data-testid="covenant-status-badge"
            >
              {breach.status.toUpperCase().replace("_", " ")}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>Cure Deadline: {formatDate(breach.cure_deadline)}</span>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div>
            <span className="text-muted-foreground block">Threshold Requirement</span>
            <span className="font-semibold text-foreground">{breach.threshold_metric}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Actual Recorded Metric</span>
            <span className="font-semibold text-destructive">{breach.actual_value}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Detected On</span>
            <span className="font-semibold text-foreground">{formatDate(breach.breach_detected_at)}</span>
          </div>
        </div>
      </div>

      {/* Action Bar for Issuer */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Covenant Cure Proposals & Voting
        </h3>

        {isIssuer && !isCreatingProposal && breach.status !== "waived" && breach.status !== "defaulted" && (
          <Button
            size="sm"
            onClick={() => setIsCreatingProposal(true)}
            data-testid="open-cure-proposal-btn"
          >
            Initiate Cure Proposal
          </Button>
        )}
      </div>

      {/* Proposal Initiation Form */}
      {isCreatingProposal && (
        <form
          onSubmit={handleCreateSubmit}
          className="rounded-lg border border-primary/30 bg-muted/20 p-4 space-y-4 text-xs"
          data-testid="cure-proposal-form"
        >
          <div className="flex items-center justify-between border-b pb-2">
            <h4 className="text-sm font-semibold">Initiate Covenant Cure Proposal</h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsCreatingProposal(false)}
            >
              Cancel
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="cure-type">Cure Type</Label>
              <select
                id="cure-type"
                value={cureType}
                onChange={(e) => setCureType(e.target.value as CureType)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                data-testid="cure-type-select"
              >
                <option value="extension">Maturity Extension</option>
                <option value="waiver">Covenant Waiver (with fee)</option>
                <option value="restructuring">Terms Restructuring</option>
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="proposal-title">Proposal Title</Label>
              <Input
                id="proposal-title"
                placeholder="e.g. 30-Day Extension with 1.5% Yield Bump"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-xs"
                data-testid="proposal-title-input"
              />
              {validation.errors.title && (
                <p className="text-[11px] text-destructive" data-testid="error-proposal-title">
                  {validation.errors.title}
                </p>
              )}
            </div>
          </div>

          {/* Conditional Fields based on Cure Type */}
          {cureType === "extension" && (
            <div className="space-y-1.5">
              <Label htmlFor="extension-days">Extension Duration (Days)</Label>
              <Input
                id="extension-days"
                type="number"
                min="1"
                max="90"
                value={extensionDays}
                onChange={(e) => setExtensionDays(e.target.value)}
                className="text-xs"
                data-testid="extension-days-input"
              />
            </div>
          )}

          {cureType === "waiver" && (
            <div className="space-y-1.5">
              <Label htmlFor="waiver-fee">Compensatory Waiver Fee (XLM)</Label>
              <Input
                id="waiver-fee"
                type="number"
                min="0"
                value={waiverFee}
                onChange={(e) => setWaiverFee(e.target.value)}
                className="text-xs"
                data-testid="waiver-fee-input"
              />
            </div>
          )}

          {cureType === "restructuring" && (
            <div className="space-y-1.5">
              <Label htmlFor="restructure-yield">Proposed Restructured Yield %</Label>
              <Input
                id="restructure-yield"
                type="number"
                min="1"
                max="50"
                step="0.1"
                value={restructureYield}
                onChange={(e) => setRestructureYield(e.target.value)}
                className="text-xs"
                data-testid="restructure-yield-input"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="proposal-description">Cure Proposal Justification & Plan (Min 15 chars)</Label>
            <Textarea
              id="proposal-description"
              rows={3}
              placeholder="Explain the cause of the DSCR dip, remedial operational actions taken, and the proposed timeline..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-xs"
              data-testid="proposal-description-input"
            />
            {validation.errors.description && (
              <p className="text-[11px] text-destructive" data-testid="error-proposal-description">
                {validation.errors.description}
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="evidence-url">Evidence & Audit Document Link (Optional)</Label>
              <Input
                id="evidence-url"
                placeholder="https://docs.issuer.com/audit.pdf"
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                className="text-xs"
                data-testid="evidence-url-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="voting-days">Investor Voting Duration</Label>
              <select
                id="voting-days"
                value={votingDays}
                onChange={(e) => setVotingDays(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
              >
                <option value="3">3 Days</option>
                <option value="7">7 Days</option>
                <option value="14">14 Days</option>
              </select>
            </div>
          </div>

          <Button
            type="submit"
            disabled={!validation.isValid || createMutation.isPending}
            className="w-full text-xs"
            data-testid="submit-proposal-btn"
          >
            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Publish Cure Proposal for Investor Voting
          </Button>
        </form>
      )}

      {/* Proposals List with Voting */}
      <div className="space-y-4">
        {proposals.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground" data-testid="no-proposals-message">
            No active or historical cure proposals submitted yet.
          </p>
        ) : (
          <ul className="space-y-4" data-testid="proposals-list">
            {proposals.map((proposal) => {
              const progress = calculateVotingProgress(proposal);
              const isExpired = new Date(proposal.voting_deadline).getTime() <= Date.now();
              const isFinalised = proposal.status !== "active";
              const userVoted = walletAddress ? proposal.voters[walletAddress.toLowerCase()] : null;

              return (
                <li
                  key={proposal.id}
                  className="rounded-lg border p-4 space-y-3 text-xs"
                  data-testid={`proposal-card-${proposal.id}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">
                          {proposal.title}
                        </span>
                        <Badge
                          variant={
                            proposal.status === "passed"
                              ? "default"
                              : proposal.status === "rejected" || proposal.status === "expired"
                                ? "destructive"
                                : "outline"
                          }
                          data-testid={`proposal-status-${proposal.id}`}
                        >
                          {proposal.status.toUpperCase()}
                        </Badge>
                        <Badge variant="secondary" className="capitalize text-[10px]">
                          {proposal.cure_type}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mt-1">{proposal.description}</p>
                    </div>

                    <div className="text-right text-[11px] text-muted-foreground shrink-0">
                      <span>Voting Deadline: {formatDate(proposal.voting_deadline)}</span>
                    </div>
                  </div>

                  {/* Quorum Progress Bar */}
                  <div className="space-y-1.5" data-testid={`quorum-progress-section-${proposal.id}`}>
                    <div className="flex justify-between font-medium">
                      <span>
                        Quorum Participation:{" "}
                        <strong data-testid={`quorum-value-${proposal.id}`}>
                          {progress.quorumPercentCurrent}%
                        </strong>{" "}
                        / 50% Required
                      </span>
                      <Badge
                        variant={progress.isQuorumReached ? "default" : "secondary"}
                        className="text-[10px]"
                        data-testid={`quorum-status-${proposal.id}`}
                      >
                        {progress.isQuorumReached ? "Quorum Reached" : "Quorum Pending"}
                      </Badge>
                    </div>
                    <Progress value={progress.quorumPercentCurrent} className="h-2" />
                  </div>

                  {/* Vote Approval Progress */}
                  <div className="space-y-1.5" data-testid={`vote-progress-section-${proposal.id}`}>
                    <div className="flex justify-between font-medium">
                      <span>
                        Approval Threshold:{" "}
                        <strong data-testid={`approval-value-${proposal.id}`}>
                          {progress.approvalPercentCurrent}% For
                        </strong>{" "}
                        (66.67% Required)
                      </span>
                      <span>
                        For: {formatAmount(proposal.voted_principal_for)} XLM · Against:{" "}
                        {formatAmount(proposal.voted_principal_against)} XLM
                      </span>
                    </div>
                    <div className="flex h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="bg-emerald-600 transition-all"
                        style={{ width: `${progress.forPercent}%` }}
                      />
                      <div
                        className="bg-rose-600 transition-all"
                        style={{ width: `${progress.againstPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Terminal details or Voting action */}
                  {isFinalised || isExpired ? (
                    <div
                      className="rounded bg-muted/40 p-2 text-xs text-muted-foreground flex items-center justify-between"
                      data-testid={`terminal-reason-${proposal.id}`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{proposal.terminal_reason ?? "Voting period finalized. More votes rejected."}</span>
                      </span>
                      <span className="text-[10px]">Outcome locked</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="text-xs">
                        <span className="text-muted-foreground">Your Eligible Voting Principal: </span>
                        <span className="font-semibold" data-testid={`eligible-principal-${proposal.id}`}>
                          {formatAmount(eligiblePrincipal)} XLM
                        </span>
                      </div>

                      {userVoted ? (
                        <Badge variant="outline" className="text-emerald-700 bg-emerald-50">
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5 inline" />
                          You Voted {userVoted.vote.toUpperCase()} ({formatAmount(userVoted.principal)} XLM)
                        </Badge>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleVote(proposal, "for")}
                            disabled={voteMutation.isPending}
                            data-testid={`vote-for-btn-${proposal.id}`}
                          >
                            Vote FOR
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs"
                            onClick={() => handleVote(proposal, "against")}
                            disabled={voteMutation.isPending}
                            data-testid={`vote-against-btn-${proposal.id}`}
                          >
                            Vote AGAINST
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Separator />

      {/* Covenant Timeline */}
      <div className="space-y-3" data-testid="covenant-timeline-section">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Covenant Audit Timeline
        </h4>
        <ul className="space-y-2" data-testid="timeline-events-list">
          {timeline.map((event) => (
            <li
              key={event.id}
              className="flex items-start gap-2.5 rounded border bg-muted/10 p-2.5 text-xs"
              data-testid={`timeline-event-${event.id}`}
            >
              <div className="mt-0.5">
                {event.event_type.includes("passed") || event.event_type.includes("cured") ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : event.event_type.includes("rejected") || event.event_type.includes("expired") ? (
                  <XCircle className="h-4 w-4 text-destructive" />
                ) : (
                  <Clock className="h-4 w-4 text-primary" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between">
                  <span className="font-semibold text-foreground">{event.title}</span>
                  <span className="text-[10px] text-muted-foreground">{formatDate(event.timestamp)}</span>
                </div>
                <p className="text-muted-foreground mt-0.5">{event.details}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
