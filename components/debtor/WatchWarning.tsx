"use client";

import { useDebtorStatus } from "@/hooks/useDebtorStatus";
import { isWatch } from "@/lib/debtorStatus";

/** Extra-safeguards notice for debtors on watch. */
export function WatchWarning({ debtorHash }: { debtorHash?: string | null }) {
  const { data } = useDebtorStatus(debtorHash);
  if (!data || !isWatch(data.status)) return null;

  return (
    <div className="mb-4 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm" role="alert" data-testid="watch-warning">
      <p className="font-medium">This debtor is on watch</p>
      <p className="text-muted-foreground">
        Extra safeguards apply. You must acknowledge the risk before funding, and the investment may need manual review.
      </p>
    </div>
  );
}
