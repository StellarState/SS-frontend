"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Clock, RotateCcw, Shield, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  isDelegationActive,
  type GovernanceDelegation,
} from "@/lib/governanceDelegation";

interface GovernanceDelegationListProps {
  keyId: string;
  userAddress: string;
  delegations: GovernanceDelegation[];
  onRevoke: (delegationId: string) => void;
  onOpenNewDelegation: () => void;
}

export function GovernanceDelegationList({
  userAddress,
  delegations,
  onRevoke,
  onOpenNewDelegation,
}: GovernanceDelegationListProps) {
  const [filter, setFilter] = useState<"all" | "active" | "revoked">("all");
  const now = Date.now();

  const formattedAddress = (addr: string) =>
    addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-6)}` : addr;

  const outgoing = useMemo(
    () => delegations.filter((d) => d.delegatorAddress === userAddress),
    [delegations, userAddress]
  );

  const incoming = useMemo(
    () => delegations.filter((d) => d.delegateAddress === userAddress),
    [delegations, userAddress]
  );

  const displayedOutgoing = useMemo(() => {
    return outgoing.filter((d) => {
      const active = isDelegationActive(d, now);
      if (filter === "active") return active;
      if (filter === "revoked") return d.status === "revoked";
      return true;
    });
  }, [outgoing, filter, now]);

  return (
    <div className="space-y-4" data-testid="governance-delegation-list">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-base font-semibold">Voting Power Delegations</h4>
          <p className="text-xs text-muted-foreground">
            Delegate your votes to trusted addresses without relinquishing key custody.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border p-0.5 text-xs">
            <button
              type="button"
              className={`rounded px-2.5 py-1 ${
                filter === "all" ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground"
              }`}
              onClick={() => setFilter("all")}
            >
              All
            </button>
            <button
              type="button"
              className={`rounded px-2.5 py-1 ${
                filter === "active" ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground"
              }`}
              onClick={() => setFilter("active")}
            >
              Active
            </button>
            <button
              type="button"
              className={`rounded px-2.5 py-1 ${
                filter === "revoked" ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground"
              }`}
              onClick={() => setFilter("revoked")}
            >
              Revoked
            </button>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={onOpenNewDelegation}
            data-testid="open-delegate-modal-btn"
          >
            Delegate Votes
          </Button>
        </div>
      </div>

      {displayedOutgoing.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            No {filter === "all" ? "" : filter} outgoing delegations found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayedOutgoing.map((del) => {
            const active = isDelegationActive(del, now);
            const expired = del.status === "active" && !active;

            return (
              <Card key={del.id} data-testid={`delegation-card-${del.id}`}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">
                        To: {formattedAddress(del.delegateAddress)}
                      </span>
                      {active ? (
                        <Badge variant="default" className="bg-emerald-600 text-xs">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Active
                        </Badge>
                      ) : expired ? (
                        <Badge variant="secondary" className="text-xs">
                          <Clock className="mr-1 h-3 w-3" />
                          Expired
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          <XCircle className="mr-1 h-3 w-3" />
                          Revoked
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs uppercase">
                        Scope: {del.scope.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Weight: <strong>{del.votingWeight} votes</strong></span>
                      <span>Created: {new Date(del.createdAt).toLocaleDateString()}</span>
                      <span>
                        Expires: {new Date(del.expiresAt).toLocaleDateString()}
                      </span>
                      {del.revokedAt && (
                        <span>Revoked: {new Date(del.revokedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>

                  {active && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-destructive/40 text-destructive hover:bg-destructive/10"
                      onClick={() => onRevoke(del.id)}
                      data-testid={`revoke-delegation-${del.id}`}
                    >
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                      Revoke
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {incoming.length > 0 && (
        <div className="mt-4 space-y-2">
          <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Incoming Delegated Voting Power
          </h5>
          {incoming.map((del) => {
            const active = isDelegationActive(del, now);
            return (
              <div
                key={del.id}
                className="flex items-center justify-between rounded-md border bg-muted/30 p-2.5 text-xs"
                data-testid={`incoming-delegation-${del.id}`}
              >
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>
                    Delegated by: <strong>{formattedAddress(del.delegatorAddress)}</strong>
                  </span>
                  <span>({del.votingWeight} votes)</span>
                </div>
                <Badge variant={active ? "default" : "secondary"} className="text-[10px]">
                  {active ? "Active" : "Expired / Revoked"}
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
