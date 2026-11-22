"use client";

import React, { useState } from "react";
import { useLoyaltyTiers } from "@/hooks/useLoyaltyTiers";

interface LoyaltyTierPanelProps {
  className?: string;
}

export function LoyaltyTierPanel({ className = "" }: LoyaltyTierPanelProps) {
  const { evaluation, reconciledLedger, redeemReward, applyServerSnapshot } =
    useLoyaltyTiers();

  const [redeemAmount, setRedeemAmount] = useState<number | "">("");
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null);

  const handleRedeem = (e: React.FormEvent) => {
    e.preventDefault();
    setRedeemError(null);
    setRedeemSuccess(null);

    const amount = Number(redeemAmount);
    const res = redeemReward(amount, "Wallet Balance");
    if (!res.success) {
      setRedeemError(res.error || "Redemption failed.");
    } else {
      setRedeemSuccess(`Successfully redeemed ${amount} XLM!`);
      setRedeemAmount("");
    }
  };

  const handleSimulateUpgrade = () => {
    applyServerSnapshot({
      snapshotId: `snap-${Date.now()}`,
      evaluatedAt: new Date().toISOString(),
      volume30dXLM: 35_000,
      retentionDays: 45,
    });
  };

  return (
    <div
      data-testid="loyalty-tier-panel"
      className={`rounded-xl border border-border bg-card p-6 shadow-sm text-card-foreground ${className}`}
    >
      {/* Header & Current Tier Badge */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight">Investor Loyalty Tier</h2>
            <span
              data-testid="current-tier-badge"
              className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary border border-primary/20 uppercase tracking-wider"
            >
              {evaluation.tier.displayName}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Last evaluated: {new Date(evaluation.snapshot.evaluatedAt).toLocaleDateString()} (Snapshot: #{evaluation.snapshot.snapshotId})
          </p>
        </div>

        {/* Multipliers Summary */}
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-muted/60 p-2.5 text-center border border-border">
            <div className="text-[10px] uppercase font-bold text-muted-foreground">Yield Multiplier</div>
            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {evaluation.tier.yieldMultiplier}x
            </div>
          </div>
          <div className="rounded-lg bg-muted/60 p-2.5 text-center border border-border">
            <div className="text-[10px] uppercase font-bold text-muted-foreground">Fee Discount</div>
            <div className="text-sm font-bold text-primary">
              {evaluation.tier.feeDiscountPercent}% Off
            </div>
          </div>
        </div>
      </div>

      {/* Progression to Next Tier */}
      {evaluation.nextTier ? (
        <div data-testid="tier-progress-card" className="mb-6 rounded-lg border border-border bg-muted/20 p-4">
          <div className="flex justify-between items-center text-xs font-semibold mb-2">
            <span>Progress to {evaluation.nextTier.displayName}</span>
            <span>{evaluation.overallProgressPercent}% Complete</span>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-muted rounded-full h-2 mb-3 overflow-hidden">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-500"
              style={{ width: `${evaluation.overallProgressPercent}%` }}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-muted-foreground">
            <div>
              • 30d Volume: {evaluation.snapshot.volume30dXLM.toLocaleString()} /{" "}
              {evaluation.nextTier.minVolumeXLM.toLocaleString()} XLM ({evaluation.volumeNeededForNext > 0 ? `${evaluation.volumeNeededForNext.toLocaleString()} needed` : "Completed"})
            </div>
            <div>
              • Active Retention: {evaluation.snapshot.retentionDays} / {evaluation.nextTier.minRetentionDays} Days (
              {evaluation.retentionDaysNeededForNext > 0 ? `${evaluation.retentionDaysNeededForNext} days needed` : "Completed"})
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
          🎉 Maximum Platinum Tier Reached! You have unlocked all top-tier sovereign protocol benefits.
        </div>
      )}

      {/* Benefits Breakdown */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-2">Active Tier Benefits</h3>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {evaluation.tier.benefits.map((b, i) => (
            <li key={i} className="flex items-center gap-2 rounded bg-muted/40 p-2 border border-border/50">
              <span className="text-emerald-500">✔</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Rewards Ledger & Redemption */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-border">
        {/* Ledger Balance & Redemption Form */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border p-4 bg-muted/10">
            <div className="text-xs text-muted-foreground">Available Reward Balance</div>
            <div data-testid="available-reward-balance" className="text-2xl font-bold font-mono text-primary mt-1">
              {reconciledLedger.availableBalanceXLM.toFixed(2)} XLM
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 flex justify-between">
              <span>Total Earned: {reconciledLedger.totalEarnedXLM.toFixed(2)}</span>
              <span>Redeemed: {reconciledLedger.totalRedeemedXLM.toFixed(2)}</span>
            </div>
          </div>

          <form onSubmit={handleRedeem} className="space-y-2 text-xs">
            <label htmlFor="redeem-amount" className="block font-medium text-muted-foreground">
              Redeem Rewards to Wallet
            </label>
            <div className="flex gap-2">
              <input
                id="redeem-amount"
                type="number"
                step="any"
                min="0.1"
                placeholder="Amount XLM"
                value={redeemAmount}
                onChange={(e) =>
                  setRedeemAmount(e.target.value ? Number(e.target.value) : "")
                }
                className="flex-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs"
              />
              <button
                type="submit"
                data-testid="redeem-reward-btn"
                className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:bg-primary/90"
              >
                Redeem
              </button>
            </div>
            {redeemError && (
              <p data-testid="redeem-error" className="text-destructive text-[11px]">{redeemError}</p>
            )}
            {redeemSuccess && (
              <p data-testid="redeem-success" className="text-emerald-600 text-[11px]">{redeemSuccess}</p>
            )}
          </form>

          <button
            type="button"
            onClick={handleSimulateUpgrade}
            className="w-full text-left text-[10px] text-muted-foreground hover:text-foreground underline pt-2"
          >
            Simulate Server Snapshot Evaluation (Test Hook)
          </button>
        </div>

        {/* Ledger Entries Table */}
        <div className="md:col-span-2">
          <h3 className="text-sm font-semibold mb-3">Rewards & Rebates Ledger</h3>
          <div className="overflow-x-auto max-h-56 overflow-y-auto border border-border rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted text-muted-foreground sticky top-0 border-b border-border">
                <tr>
                  <th className="py-2 px-3">Description</th>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reconciledLedger.entries.map((entry) => (
                  <tr key={entry.id} data-testid={`ledger-entry-${entry.id}`}>
                    <td className="py-2 px-3">{entry.description}</td>
                    <td className="py-2 px-3 text-[11px] text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleDateString()}
                    </td>
                    <td
                      className={`py-2 px-3 text-right font-mono font-medium ${
                        entry.type === "redemption"
                          ? "text-destructive"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {entry.type === "redemption" ? "-" : "+"}
                      {entry.amountXLM.toFixed(2)} XLM
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
