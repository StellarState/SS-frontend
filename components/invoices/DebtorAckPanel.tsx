"use client";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { AckStatusBadge } from "@/components/invoices/AckStatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebtorAck } from "@/hooks/useDebtorAck";

interface DebtorAckPanelProps {
  invoiceId: string;
}

/**
 * Shows debtor acknowledgement status on the invoice detail page (#620).
 *
 * Returns null when the status is `not_required` so it doesn't add noise.
 * When pending+required, a banner warns that funding is blocked until the
 * debtor acknowledges. When revoked, a warning banner signals that investing
 * is disabled.
 */
export function DebtorAckPanel({ invoiceId }: DebtorAckPanelProps) {
  const { data, isLoading } = useDebtorAck(invoiceId);

  if (isLoading) {
    return (
      <Card data-testid="debtor-ack-loading">
        <CardContent className="pt-4">
          <Skeleton className="h-4 w-48" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.status === "not_required") return null;

  return (
    <Card data-testid="debtor-ack-panel">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Debtor acknowledgement</span>
          <AckStatusBadge status={data.status} />
        </div>

        {data.status === "pending" && data.requireAck && (
          <div
            className="flex items-start gap-2 rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-800"
            role="alert"
            data-testid="ack-pending-banner"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>
              Funding opens after the debtor acknowledges the invoice. Investment
              is unavailable until then.
            </p>
          </div>
        )}

        {data.status === "acknowledged" && (
          <div
            className="space-y-1 text-sm text-muted-foreground"
            data-testid="ack-acknowledged-info"
          >
            {data.acknowledgedAt && (
              <p>
                Acknowledged on{" "}
                {new Date(data.acknowledgedAt).toLocaleDateString(undefined, {
                  dateStyle: "medium",
                })}
              </p>
            )}
            {data.recordUrl && (
              <a
                href={data.recordUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
                data-testid="ack-record-link"
              >
                On-chain record
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            )}
          </div>
        )}

        {data.status === "revoked" && (
          <div
            className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            role="alert"
            data-testid="ack-revoked-banner"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>
              The debtor has revoked their acknowledgement. Investment is disabled.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Returns true when the debtor ack status blocks investment.
 * Used by the invest panel to disable the invest button.
 */
export function useDebtorAckBlocked(invoiceId: string): boolean {
  const { data } = useDebtorAck(invoiceId);
  if (!data) return false;
  if (data.status === "pending" && data.requireAck) return true;
  if (data.status === "revoked") return true;
  return false;
}
