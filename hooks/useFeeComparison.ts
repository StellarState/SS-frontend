"use client";

import { useState, useMemo, useCallback } from "react";
import {
  type ComparisonScenario,
  type ComparisonReport,
  compareFeeScenarios,
  PROTOCOL_LIMITS,
} from "@/lib/fees/feeComparison";

const DEFAULT_INITIAL_SCENARIOS: ComparisonScenario[] = [
  {
    id: "scenario-1",
    label: "Scenario A: Standard Primary Purchase",
    amount: 10_000,
    role: "investor",
    transactionType: "primary_purchase",
    discountTier: "standard",
  },
  {
    id: "scenario-2",
    label: "Scenario B: Gold Tier Secondary Trade",
    amount: 10_000,
    role: "investor",
    transactionType: "secondary_trade",
    discountTier: "gold",
  },
];

export function useFeeComparison(initialScenarios = DEFAULT_INITIAL_SCENARIOS) {
  const [scenarios, setScenarios] = useState<ComparisonScenario[]>(initialScenarios);

  const report: ComparisonReport = useMemo(() => {
    return compareFeeScenarios(scenarios);
  }, [scenarios]);

  const addScenario = useCallback(() => {
    if (scenarios.length >= PROTOCOL_LIMITS.MAX_SCENARIOS) return;
    const newIndex = scenarios.length + 1;
    const newScenario: ComparisonScenario = {
      id: `scenario-${Date.now()}-${newIndex}`,
      label: `Scenario ${String.fromCharCode(65 + scenarios.length)}: Custom Tier`,
      amount: 5_000,
      role: "investor",
      transactionType: "primary_purchase",
      discountTier: "silver",
    };
    setScenarios((prev) => [...prev, newScenario]);
  }, [scenarios.length]);

  const updateScenario = useCallback(
    (id: string, updates: Partial<Omit<ComparisonScenario, "id">>) => {
      setScenarios((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      );
    },
    [],
  );

  const duplicateScenario = useCallback(
    (id: string) => {
      if (scenarios.length >= PROTOCOL_LIMITS.MAX_SCENARIOS) return;
      const target = scenarios.find((s) => s.id === id);
      if (!target) return;
      const copy: ComparisonScenario = {
        ...target,
        id: `scenario-${Date.now()}`,
        label: `${target.label} (Copy)`,
      };
      setScenarios((prev) => [...prev, copy]);
    },
    [scenarios],
  );

  const removeScenario = useCallback((id: string) => {
    setScenarios((prev) => {
      if (prev.length <= 1) return prev; // Keep at least one scenario
      return prev.filter((s) => s.id !== id);
    });
  }, []);

  const resetDefaults = useCallback(() => {
    setScenarios(DEFAULT_INITIAL_SCENARIOS);
  }, []);

  return {
    scenarios,
    report,
    canAddScenario: scenarios.length < PROTOCOL_LIMITS.MAX_SCENARIOS,
    addScenario,
    updateScenario,
    duplicateScenario,
    removeScenario,
    resetDefaults,
  };
}
