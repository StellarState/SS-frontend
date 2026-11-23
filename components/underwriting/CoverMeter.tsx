"use client";

import { coverPercent } from "@/lib/underwriting";

interface CoverMeterProps {
  staked: number;
  maxCover: number;
  /** Cover consumed by a default, drawn over the staked bar. */
  lossAbsorbed?: number;
}

/** Staked underwriting cover against the invoice's maximum cover limit (#587). */
export function CoverMeter({ staked, maxCover, lossAbsorbed = 0 }: CoverMeterProps) {
  const pct = coverPercent(staked, maxCover);
  const lossPct = coverPercent(Math.min(lossAbsorbed, staked), maxCover);
  const remaining = Math.max(0, maxCover - staked);

  return (
    <div className="space-y-2" data-testid="cover-meter">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">
          <span data-testid="cover-meter-staked">{staked.toLocaleString()}</span> /{" "}
          <span data-testid="cover-meter-cap">{maxCover.toLocaleString()}</span> XLM covered
        </span>
        <span className="text-muted-foreground" data-testid="cover-meter-percent">
          {pct.toFixed(1)}%
        </span>
      </div>
      <div
        className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-label="Underwriting cover"
        aria-valuemin={0}
        aria-valuemax={maxCover}
        aria-valuenow={staked}
      >
        <div
          className="absolute inset-y-0 left-0 bg-primary transition-all"
          style={{ width: `${pct}%` }}
          data-testid="cover-meter-fill"
        />
        {lossPct > 0 && (
          <div
            className="absolute inset-y-0 left-0 bg-destructive"
            style={{ width: `${lossPct}%` }}
            data-testid="cover-meter-loss"
          />
        )}
      </div>
      <p className="text-xs text-muted-foreground" data-testid="cover-meter-remaining">
        {remaining > 0
          ? `${remaining.toLocaleString()} XLM capacity remaining`
          : "Fully covered"}
        {lossAbsorbed > 0 && ` · ${lossAbsorbed.toLocaleString()} XLM absorbed by default`}
      </p>
    </div>
  );
}
