"use client";

import { useState, useMemo, useCallback } from "react";
import {
  ComplianceCase,
  ComplianceQueueFilters,
  filterComplianceCases,
  recordComplianceDecision,
  computeSlaStatus,
  SAMPLE_COMPLIANCE_CASES,
} from "@/lib/admin/complianceQueue";

export interface UseComplianceQueueOptions {
  initialCases?: ComplianceCase[];
  initialFilters?: ComplianceQueueFilters;
  currentOperator?: string;
}

export function useComplianceQueue(options?: UseComplianceQueueOptions) {
  const [cases, setCases] = useState<ComplianceCase[]>(
    options?.initialCases ?? SAMPLE_COMPLIANCE_CASES
  );
  const [filters, setFilters] = useState<ComplianceQueueFilters>(
    options?.initialFilters ?? {
      category: "all",
      riskTier: "all",
      assignee: "all",
      status: "all",
      search: "",
    }
  );
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  const currentOperator = options?.currentOperator || "compliance.lead@stellarsettle.org";

  const filteredCases = useMemo(() => {
    return filterComplianceCases(cases, filters);
  }, [cases, filters]);

  const selectedCase = useMemo(() => {
    if (!selectedCaseId) return null;
    return cases.find((c) => c.id === selectedCaseId) || null;
  }, [cases, selectedCaseId]);

  // Counts update immediately after resolution (#671 acceptance criteria)
  const counts = useMemo(() => {
    let pending = 0;
    let critical = 0;
    let escalated = 0;
    let resolved = 0;

    const now = Date.now();
    for (const c of cases) {
      if (c.status === "pending_review" || c.status === "evidence_requested") {
        pending++;
        if (c.riskTier === "critical") critical++;
        const sla = computeSlaStatus(c.slaDeadline, now);
        if (sla.isEscalated) escalated++;
      } else if (c.status === "approved" || c.status === "restricted") {
        resolved++;
      }
    }

    return {
      total: cases.length,
      pending,
      critical,
      escalated,
      resolved,
    };
  }, [cases]);

  const updateFilters = useCallback((partial: Partial<ComplianceQueueFilters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  }, []);

  const makeDecision = useCallback(
    (
      caseId: string,
      action: "approved" | "evidence_requested" | "restricted",
      comment: string,
      operator: string = currentOperator
    ) => {
      const target = cases.find((c) => c.id === caseId);
      if (!target) {
        return { success: false, error: "Case not found." };
      }

      const res = recordComplianceDecision(target, action, operator, comment);
      if (res.success && res.updatedCase) {
        setCases((prev) =>
          prev.map((c) => (c.id === caseId ? res.updatedCase! : c))
        );
        return { success: true };
      }

      return { success: false, error: res.error };
    },
    [cases, currentOperator]
  );

  return {
    cases,
    filteredCases,
    filters,
    updateFilters,
    selectedCase,
    setSelectedCaseId,
    makeDecision,
    counts,
  };
}
