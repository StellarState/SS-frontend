"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ApproveOperatorModal } from "@/components/operators/ApproveOperatorModal";
import { useAuth } from "@/hooks/useAuth";
import { useOperators } from "@/hooks/useOperators";
import { truncateAddress } from "@/lib/stellar";
import { MAX_ACTIVE_OPERATORS, OPERATOR_EXPLANATION, operatorStatus } from "@/lib/operators";

/**
 * Settings → Operators (#591): approve, review and revoke custodians allowed
 * to claim payouts on the investor's behalf.
 */
export function OperatorsPage() {
  const { address } = useAuth();
  const { operators, activeCount, limitReached, isLoading, isError, approve, revoke } = useOperators();
  const [approveOpen, setApproveOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);

  if (!address) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="operators-connect">
        Connect your wallet to manage operators.
      </p>
    );
  }

  return (
    <div className="space-y-6" data-testid="operators-page">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Operators</h1>
          <p className="mt-1 text-sm text-muted-foreground">{OPERATOR_EXPLANATION}</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-sm ${limitReached ? "text-destructive" : "text-muted-foreground"}`}
            data-testid="operators-counter"
          >
            {activeCount} / {MAX_ACTIVE_OPERATORS} active
          </span>
          <Button
            type="button"
            onClick={() => setApproveOpen(true)}
            disabled={limitReached}
            title={limitReached ? `You can have at most ${MAX_ACTIVE_OPERATORS} active operators` : undefined}
            data-testid="approve-operator-open"
          >
            <UserPlus className="mr-1 h-4 w-4" />
            Approve operator
          </Button>
        </div>
      </div>

      {limitReached && (
        <p className="text-sm text-destructive" role="status" data-testid="operators-limit-reached">
          You have reached the limit of {MAX_ACTIVE_OPERATORS} active operators. Revoke one to
          approve another.
        </p>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Approved operators</h2>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2" data-testid="operators-loading">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : isError ? (
            <p className="text-sm text-destructive" data-testid="operators-error">
              Could not load your operators.
            </p>
          ) : operators.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground" data-testid="operators-empty">
              No operators approved yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm" data-testid="operators-table">
                <thead className="border-b text-muted-foreground">
                  <tr>
                    <th className="p-2 font-medium">Address</th>
                    <th className="p-2 font-medium">Expires</th>
                    <th className="p-2 font-medium">Status</th>
                    <th className="p-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {operators.map((op) => {
                    const status = operatorStatus(op);
                    return (
                      <tr key={op.address} data-testid={`operator-row-${op.address}`}>
                        <td className="p-2 font-mono" title={op.address}>
                          {truncateAddress(op.address)}
                        </td>
                        <td className="p-2">{new Date(op.expires_at).toLocaleDateString()}</td>
                        <td className="p-2">
                          <Badge
                            variant={status === "active" ? "default" : "outline"}
                            data-testid={`operator-status-${op.address}`}
                          >
                            {status === "active" ? "Active" : "Expired"}
                          </Badge>
                        </td>
                        <td className="p-2 text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setRevokeTarget(op.address)}
                            data-testid={`operator-revoke-${op.address}`}
                          >
                            Revoke
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ApproveOperatorModal
        open={approveOpen}
        onOpenChange={setApproveOpen}
        investor={address}
        existing={operators}
        isSubmitting={approve.isPending}
        onApprove={(input) => approve.mutateAsync(input)}
      />

      <Dialog open={revokeTarget !== null} onOpenChange={(o) => !o && setRevokeTarget(null)}>
        <DialogContent data-testid="revoke-operator-dialog">
          <DialogHeader>
            <DialogTitle>Revoke operator?</DialogTitle>
            <DialogDescription>
              <span className="font-mono break-all">{revokeTarget}</span> will immediately lose the
              ability to claim payouts for you.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setRevokeTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (revokeTarget) revoke.mutate(revokeTarget);
                setRevokeTarget(null);
              }}
              data-testid="revoke-operator-confirm"
            >
              Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
