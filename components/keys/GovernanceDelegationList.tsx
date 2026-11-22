"use client";

import React, { useState } from "react";
import {
  useGovernanceDelegations,
  UseGovernanceDelegationsOptions,
} from "@/hooks/useGovernanceDelegations";
import { DelegationModal } from "@/components/keys/DelegationModal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Shield,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  RotateCcw,
  CheckCircle2,
  XCircle,
  PlusCircle,
  Lock,
} from "lucide-react";

export interface GovernanceDelegationListProps {
  keyId: string;
  initialOptions?: UseGovernanceDelegationsOptions;
}

export function GovernanceDelegationList({
  keyId,
  initialOptions,
}: GovernanceDelegationListProps) {
  const {
    outgoingDelegations,
    incomingDelegations,
    powerMetrics,
    whitelistEnabled,
    whitelistedAddresses,
    addDelegation,
    handleRevoke,
  } = useGovernanceDelegations({
    keyId,
    ...initialOptions,
  });

  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="space-y-4" data-testid="governance-delegation-list">
      {/* Delegation & Voting Power Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs" data-testid="delegation-metrics-cards">
        <Card className="p-3.5 bg-card/60">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Direct Custody</span>
            <Lock className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="mt-1.5 text-lg font-bold font-mono" data-testid="metric-own-custody">
            {powerMetrics.ownCustodyKeys} keys
          </div>
          <span className="text-[10px] text-muted-foreground">Keys in your wallet (custody intact)</span>
        </Card>

        <Card className="p-3.5 bg-card/60">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Delegated Out</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="mt-1.5 text-lg font-bold font-mono text-amber-600" data-testid="metric-delegated-out">
            {powerMetrics.delegatedOut} keys
          </div>
          <span className="text-[10px] text-muted-foreground">Voting rights granted to delegates</span>
        </Card>

        <Card className="p-3.5 bg-card/60">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Delegated In</span>
            <ArrowDownLeft className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="mt-1.5 text-lg font-bold font-mono text-blue-600" data-testid="metric-delegated-in">
            {powerMetrics.delegatedIn} keys
          </div>
          <span className="text-[10px] text-muted-foreground">Voting rights received from others</span>
        </Card>

        <Card className="p-3.5 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between text-primary font-semibold">
            <span>Effective Voting Power</span>
            <Shield className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1.5 text-lg font-bold font-mono text-primary" data-testid="metric-effective-power">
            {powerMetrics.effectiveVotingPower} votes
          </div>
          <span className="text-[10px] text-muted-foreground">Used to cast governance ballots</span>
        </Card>
      </div>

      {/* Outgoing Delegations Card */}
      <Card>
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Users className="w-4 h-4 text-primary" />
              Active Governance Delegations
            </CardTitle>
            <CardDescription className="text-xs">
              Manage stewards voting on your behalf. Custody is never transferred.
            </CardDescription>
          </div>
          <Button
            size="sm"
            className="text-xs h-8"
            onClick={() => setModalOpen(true)}
            disabled={powerMetrics.effectiveVotingPower <= 0 && powerMetrics.ownCustodyKeys <= powerMetrics.delegatedOut}
            data-testid="btn-open-delegation-modal"
          >
            <PlusCircle className="w-3.5 h-3.5 mr-1" />
            Delegate Votes
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {outgoingDelegations.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground" data-testid="empty-delegations-state">
              No delegations configured. You currently exercise 100% of your voting power directly.
            </div>
          ) : (
            <div className="divide-y text-xs">
              {outgoingDelegations.map((d) => {
                const isExpired = new Date(d.expiresAt).getTime() <= Date.now();
                const isRevoked = d.status === "revoked";
                const isActive = !isExpired && !isRevoked;

                return (
                  <div
                    key={d.id}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20"
                    data-testid={`delegation-item-${d.id}`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-foreground">
                          {d.delegateAddress.slice(0, 10)}...{d.delegateAddress.slice(-6)}
                        </span>
                        {isActive && (
                          <Badge variant="default" className="bg-emerald-600 text-[10px]" data-testid={`badge-active-${d.id}`}>
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        )}
                        {isExpired && (
                          <Badge variant="outline" className="text-muted-foreground border-muted-foreground text-[10px]" data-testid={`badge-expired-${d.id}`}>
                            <Clock className="w-3 h-3 mr-1" />
                            Expired
                          </Badge>
                        )}
                        {isRevoked && (
                          <Badge variant="destructive" className="text-[10px]" data-testid={`badge-revoked-${d.id}`}>
                            <XCircle className="w-3 h-3 mr-1" />
                            Revoked
                          </Badge>
                        )}
                        {d.whitelistVerified && (
                          <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-400">
                            Whitelisted
                          </Badge>
                        )}
                      </div>

                      <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-2">
                        <span>Delegated: <strong className="font-mono text-foreground">{d.votingPower} keys</strong></span>
                        <span>&bull;</span>
                        <span>Scope: <strong className="capitalize text-foreground">{d.scope.replace("_", " ")}</strong></span>
                        <span>&bull;</span>
                        <span>
                          {isActive ? `Expires: ${new Date(d.expiresAt).toLocaleDateString()}` : `Ended: ${new Date(d.expiresAt).toLocaleDateString()}`}
                        </span>
                      </div>
                    </div>

                    {isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 text-destructive hover:bg-destructive/10"
                        onClick={() => handleRevoke(d.id)}
                        data-testid={`btn-revoke-${d.id}`}
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Revoke Power
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <DelegationModal
        keyId={keyId}
        open={modalOpen}
        onOpenChange={setModalOpen}
        maxAvailablePower={Math.max(0, powerMetrics.ownCustodyKeys - powerMetrics.delegatedOut)}
        whitelistEnabled={whitelistEnabled}
        whitelistedAddresses={whitelistedAddresses}
        onDelegate={addDelegation}
      />
    </div>
  );
}
