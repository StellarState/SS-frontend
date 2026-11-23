"use client";

import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettlementAllocation } from "@/hooks/useSettlementAllocation";
import {
  allocationBalances,
  allocationSummary,
  zeroPaymentExplanation,
} from "@/lib/settlementAllocation";
import type { PayoutClass } from "@/lib/api/settlementAllocation";

function ClassRow({ entry }: { entry: PayoutClass }) {
  const percent = entry.owed > 0 ? Math.min(100, Math.round((entry.paid / entry.owed) * 100)) : 0;
  const explanation = zeroPaymentExplanation(entry);

  return (
    <li
      className={`space-y-2 rounded-md border p-3 ${entry.isUserClass ? "border-primary bg-primary/5" : ""}`}
      data-testid={`payout-class-${entry.id}`}
      data-user-class={entry.isUserClass || undefined}
    >
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          {entry.priority}. {entry.label}
          {entry.isUserClass && " (your class)"}
        </span>
        <span className="tabular-nums" data-testid={`payout-class-paid-${entry.id}`}>
          {entry.paid.toLocaleString()} / {entry.owed.toLocaleString()} XLM
        </span>
      </div>
      <Progress value={percent} aria-label={`${entry.label} paid share`} />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Shortfall: {entry.shortfall.toLocaleString()} XLM</span>
        {entry.isUserClass && <span>Your payout: {entry.userPayout.toLocaleString()} XLM</span>}
      </div>
      {explanation && <p className="text-xs text-muted-foreground">{explanation}</p>}
    </li>
  );
}

/** Priority-ordered settlement waterfall for one invoice. */
export function PayoutWaterfall({ invoiceId }: { invoiceId: string }) {
  const { data, isLoading } = useSettlementAllocation(invoiceId);

  if (isLoading) {
    return <Skeleton className="h-24 w-full" data-testid="payout-waterfall-loading" />;
  }

  if (!data) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="payout-waterfall-unavailable">
        Allocation details are not available yet.
      </p>
    );
  }

  if (data.status === "pending") {
    return (
      <p className="text-sm text-muted-foreground" data-testid="payout-waterfall-pending">
        {allocationSummary(data)}
      </p>
    );
  }

  return (
    <section className="space-y-3" data-testid="payout-waterfall">
      <p className="text-sm" data-testid="payout-waterfall-summary">
        {allocationSummary(data)}
      </p>
      {!allocationBalances(data) && (
        <p className="text-xs text-amber-600" data-testid="payout-waterfall-mismatch">
          Reported paid amounts do not match the amount received.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Amount received: {data.amountReceived.toLocaleString()} XLM
      </p>
      <ol className="space-y-2">
        {data.classes.map((entry) => (
          <ClassRow key={entry.id} entry={entry} />
        ))}
      </ol>
    </section>
  );
}
