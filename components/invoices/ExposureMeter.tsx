"use client";

import { Progress } from "@/components/ui/progress";
import { useDebtorHeadroom } from "@/hooks/useDebtorHeadroom";
import { isAtCap, isNearCap, usedRatio } from "@/lib/exposure";

/** Shows outstanding exposure against the platform cap. Hidden without cap data. */
export function ExposureMeter({
  debtorId,
  context = "detail",
}: {
  debtorId?: string | null;
  context?: "detail" | "form";
}) {
  const { data: headroom } = useDebtorHeadroom(debtorId);
  if (!headroom) return null;

  const percent = Math.round(usedRatio(headroom) * 100);
  const atCap = isAtCap(headroom);
  const nearCap = isNearCap(headroom);

  return (
    <div className="space-y-2 rounded-md border p-3" data-testid="exposure-meter">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Debtor exposure</span>
        <span className="tabular-nums" data-testid="exposure-ratio">{percent}% of cap</span>
      </div>
      <Progress value={percent} aria-label="Debtor exposure against cap" />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span data-testid="exposure-outstanding">{headroom.outstanding.toLocaleString()} XLM outstanding</span>
        <span data-testid="exposure-headroom">{headroom.headroom.toLocaleString()} XLM remaining</span>
      </div>
      {(nearCap || atCap) && (
        <p
          className={`text-xs ${atCap ? "text-destructive" : "text-amber-600"}`}
          data-testid={atCap ? "exposure-at-cap" : "exposure-near-cap"}
          role={atCap ? "alert" : undefined}
        >
          {atCap
            ? "This debtor is at the platform cap. New funding is blocked."
            : "This debtor is close to the platform cap. Choose a smaller amount."}
        </p>
      )}
      {context === "form" && !atCap && !nearCap && (
        <p className="text-xs text-muted-foreground">Cap data is available for this debtor.</p>
      )}
    </div>
  );
}
