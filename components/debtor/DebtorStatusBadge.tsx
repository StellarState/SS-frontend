"use client";

import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDebtorStatus } from "@/hooks/useDebtorStatus";
import { recentHistory, STATUS_VARIANT } from "@/lib/debtorStatus";

/** Status badge with an accessible history popover capped at ten changes. */
export function DebtorStatusBadge({ debtorHash }: { debtorHash?: string | null }) {
  const { data } = useDebtorStatus(debtorHash);
  const status = data?.status ?? "Neutral";
  const history = recentHistory(data ?? { status, history: [] });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Debtor status ${status}. View history`}
          data-testid="debtor-status-badge"
        >
          <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72" data-testid="debtor-status-history">
        <p className="mb-2 text-sm font-semibold">Status history</p>
        {history.length === 0 ? (
          <p className="text-xs text-muted-foreground">No status changes recorded.</p>
        ) : (
          <ol className="space-y-2 text-xs">
            {history.map((change, index) => (
              <li key={`${change.changedAt}-${index}`} className="flex justify-between gap-2">
                <span>
                  {change.from} to <strong>{change.to}</strong>
                </span>
                <span className="text-muted-foreground">
                  {change.changedAt ? new Date(change.changedAt).toLocaleDateString() : "Unknown date"}
                </span>
              </li>
            ))}
          </ol>
        )}
      </PopoverContent>
    </Popover>
  );
}
