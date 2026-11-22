"use client";

import React from "react";
import {
  type UserRole,
  type TransactionType,
  type FeeDiscountTier,
  PROTOCOL_FEE_TIERS,
  TRANSACTION_TYPE_RULES,
  PROTOCOL_LIMITS,
} from "@/lib/fees/feeComparison";
import { useFeeComparison } from "@/hooks/useFeeComparison";

interface FeeComparisonCalculatorProps {
  className?: string;
}

export function FeeComparisonCalculator({ className = "" }: FeeComparisonCalculatorProps) {
  const {
    scenarios,
    report,
    canAddScenario,
    addScenario,
    updateScenario,
    duplicateScenario,
    removeScenario,
    resetDefaults,
  } = useFeeComparison();

  return (
    <div
      data-testid="fee-comparison-calculator"
      className={`rounded-xl border border-border bg-card p-6 shadow-sm text-card-foreground ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4 mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            Protocol Fee Comparison Calculator
          </h2>
          <p className="text-sm text-muted-foreground">
            Compare transaction costs across user roles, tiers, and market actions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {report.maxSavingsAmount > 0 && (
            <span
              data-testid="max-savings-badge"
              className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
            >
              Potential Savings: {report.maxSavingsAmount.toFixed(4)} XLM
            </span>
          )}
          <button
            type="button"
            onClick={addScenario}
            disabled={!canAddScenario}
            data-testid="add-scenario-btn"
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            + Add Scenario ({scenarios.length}/{PROTOCOL_LIMITS.MAX_SCENARIOS})
          </button>
          <button
            type="button"
            onClick={resetDefaults}
            className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Scenarios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {report.scenarios.map(({ scenario, result }, idx) => {
          const isCheapest =
            report.cheapestScenarioId === scenario.id &&
            report.scenarios.length > 1;

          return (
            <div
              key={scenario.id}
              data-testid={`scenario-card-${scenario.id}`}
              className={`flex flex-col rounded-xl border p-5 transition-all ${
                isCheapest
                  ? "border-emerald-500/50 bg-emerald-500/5 ring-1 ring-emerald-500/30"
                  : "border-border bg-background"
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <input
                    type="text"
                    aria-label={`Scenario ${idx + 1} Label`}
                    value={scenario.label}
                    onChange={(e) =>
                      updateScenario(scenario.id, { label: e.target.value })
                    }
                    className="font-semibold text-sm bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-ring rounded px-1"
                  />
                </div>
                {isCheapest && (
                  <span className="rounded bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                    Lowest Fee
                  </span>
                )}
              </div>

              {/* Form Controls */}
              <div className="space-y-3 text-xs mb-5">
                {/* Amount */}
                <div>
                  <label
                    htmlFor={`amount-${scenario.id}`}
                    className="block font-medium text-muted-foreground mb-1"
                  >
                    Amount (XLM)
                  </label>
                  <input
                    id={`amount-${scenario.id}`}
                    type="number"
                    min={PROTOCOL_LIMITS.MIN_AMOUNT_XLM}
                    max={PROTOCOL_LIMITS.MAX_AMOUNT_XLM}
                    step="any"
                    value={scenario.amount}
                    onChange={(e) =>
                      updateScenario(scenario.id, {
                        amount: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                {/* Role */}
                <div>
                  <label
                    htmlFor={`role-${scenario.id}`}
                    className="block font-medium text-muted-foreground mb-1"
                  >
                    Participant Role
                  </label>
                  <select
                    id={`role-${scenario.id}`}
                    value={scenario.role}
                    onChange={(e) =>
                      updateScenario(scenario.id, {
                        role: e.target.value as UserRole,
                      })
                    }
                    className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="investor">Investor</option>
                    <option value="issuer">Invoice Issuer (Borrower)</option>
                    <option value="secondary_trader">Secondary Trader</option>
                  </select>
                </div>

                {/* Transaction Type */}
                <div>
                  <label
                    htmlFor={`txtype-${scenario.id}`}
                    className="block font-medium text-muted-foreground mb-1"
                  >
                    Action / Transaction Type
                  </label>
                  <select
                    id={`txtype-${scenario.id}`}
                    value={scenario.transactionType}
                    onChange={(e) =>
                      updateScenario(scenario.id, {
                        transactionType: e.target.value as TransactionType,
                      })
                    }
                    className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {Object.entries(TRANSACTION_TYPE_RULES).map(([key, rule]) => (
                      <option key={key} value={key}>
                        {rule.name} ({(rule.baseRateBps / 100).toFixed(2)}%)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Discount Tier */}
                <div>
                  <label
                    htmlFor={`tier-${scenario.id}`}
                    className="block font-medium text-muted-foreground mb-1"
                  >
                    Volume / Loyalty Tier
                  </label>
                  <select
                    id={`tier-${scenario.id}`}
                    value={scenario.discountTier}
                    onChange={(e) =>
                      updateScenario(scenario.id, {
                        discountTier: e.target.value as FeeDiscountTier,
                      })
                    }
                    className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {Object.entries(PROTOCOL_FEE_TIERS).map(([key, tier]) => (
                      <option key={key} value={key}>
                        {tier.name} ({tier.discountPercentage * 100}% off)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Ineligibility Warning */}
              {!result.isDiscountEligible && result.ineligibilityReason && (
                <div
                  data-testid="ineligible-warning"
                  className="mb-4 rounded bg-amber-500/10 border border-amber-500/20 p-2 text-[11px] text-amber-700 dark:text-amber-400"
                >
                  ⚠️ {result.ineligibilityReason}
                </div>
              )}

              {/* Fee Results Breakdown */}
              <div className="mt-auto space-y-2 rounded-lg bg-muted/40 p-3 text-xs border border-border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base Protocol Fee:</span>
                  <span className="font-mono">
                    {result.clampedBaseFee.toFixed(4)} XLM
                    {result.isMinFeeApplied && (
                      <span className="ml-1 text-[10px] text-blue-500 font-semibold">(Min Cap)</span>
                    )}
                    {result.isMaxFeeApplied && (
                      <span className="ml-1 text-[10px] text-amber-500 font-semibold">(Max Cap)</span>
                    )}
                  </span>
                </div>

                {result.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Discount ({result.discountPercentage * 100}%):</span>
                    <span className="font-mono">-{result.discountAmount.toFixed(4)} XLM</span>
                  </div>
                )}

                <div className="flex justify-between text-muted-foreground">
                  <span>Network Fee:</span>
                  <span className="font-mono">{result.networkFee.toFixed(5)} XLM</span>
                </div>

                <div className="border-t border-border pt-2 flex justify-between font-bold text-sm">
                  <span>Total Fee:</span>
                  <span className="font-mono text-primary">
                    {result.finalFee.toFixed(4)} XLM
                  </span>
                </div>

                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Effective Rate:</span>
                  <span>{result.effectiveRatePercentage.toFixed(3)}%</span>
                </div>

                <div className="flex justify-between text-[11px] text-muted-foreground font-medium pt-1 border-t border-border/50">
                  <span>Total Required:</span>
                  <span className="font-mono font-semibold">{result.totalCost.toFixed(4)} XLM</span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border text-[11px]">
                <button
                  type="button"
                  onClick={() => duplicateScenario(scenario.id)}
                  disabled={!canAddScenario}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                >
                  Duplicate
                </button>
                {scenarios.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeScenario(scenario.id)}
                    className="text-destructive hover:underline transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
