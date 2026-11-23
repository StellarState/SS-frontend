"use client";

import { useState, useMemo, useCallback } from "react";
import {
  MonitoredCovenant,
  CovenantEvidenceRecord,
  filterCovenantsForAudience,
} from "@/lib/analytics/covenantMonitoring";

const DEFAULT_COVENANTS: MonitoredCovenant[] = [
  {
    id: "cov-dscr",
    name: "Debt Service Coverage Ratio (DSCR)",
    description: "Minimum operating cash flow to debt service obligations.",
    metric_unit: "x",
    direction: "min",
    threshold_value: 1.25,
    warning_threshold_value: 1.4,
    current_value: 1.55,
    status: "healthy",
    headroom_value: 0.3,
    headroom_percent: 24.0,
    last_tested_at: "2026-11-15T00:00:00Z",
    next_test_date: "2026-12-15T00:00:00Z",
    evidence_records: [
      {
        id: "doc-dscr-q3",
        title: "Q3 Debt Service Reconciliation Certificate",
        document_type: "bank_attestation",
        cid: "bafybeidscrcertq3hash2026",
        sha256_hash: "a4f89d31c890123efb672198425dce881234abcd7890ef0123456789abcdef01",
        uploaded_at: "2026-11-15T10:00:00Z",
        visibility: "public",
      },
    ],
  },
  {
    id: "cov-leverage",
    name: "Maximum Leverage Ratio",
    description: "Total outstanding debt relative to annualized EBITDA.",
    metric_unit: "x",
    direction: "max",
    threshold_value: 3.5,
    warning_threshold_value: 3.1,
    current_value: 3.25,
    status: "warning",
    headroom_value: 0.25,
    headroom_percent: 7.14,
    last_tested_at: "2026-11-18T00:00:00Z",
    next_test_date: "2026-12-18T00:00:00Z",
    evidence_records: [
      {
        id: "doc-lev-audit",
        title: "Interim Leverage Ratio Assessment",
        document_type: "audit_report",
        cid: "bafybeileverageauditreport2026",
        sha256_hash: "e7c10293847561029384756102938475e7c10293847561029384756102938475",
        uploaded_at: "2026-11-18T14:30:00Z",
        visibility: "authorized_investors_only",
      },
    ],
  },
  {
    id: "cov-liquidity",
    name: "Minimum Unencumbered Working Capital",
    description: "Maintain liquid reserves to cover 60 days of operations.",
    metric_unit: "XLM",
    direction: "min",
    threshold_value: 200000,
    warning_threshold_value: 230000,
    current_value: 185000,
    status: "breached",
    headroom_value: -15000,
    headroom_percent: -7.5,
    cure_deadline: "2026-12-04T23:59:59Z", // Active cure countdown
    cure_plan_summary:
      "Issuer scheduled a 30,000 XLM reserve deposit from Q4 accounts receivable by Nov 28.",
    last_tested_at: "2026-11-20T00:00:00Z",
    next_test_date: "2026-12-20T00:00:00Z",
    evidence_records: [
      {
        id: "doc-breach-notice",
        title: "Covenant Headroom Breach Notice",
        document_type: "audit_report",
        cid: "bafybeicovenantliquiditybreachnotice2026",
        sha256_hash: "99887766554433221100aabbccddeeff99887766554433221100aabbccddeeff",
        uploaded_at: "2026-11-20T16:00:00Z",
        visibility: "public",
      },
      {
        id: "doc-cure-proposal",
        title: "Cure Escrow Deposit Authorization",
        document_type: "financial_statement",
        cid: "bafybeicureescrowproposalauthenticated",
        sha256_hash: "11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff",
        uploaded_at: "2026-11-21T09:00:00Z",
        visibility: "authorized_investors_only",
      },
    ],
  },
];

export function useCovenantMonitoring(
  initialCovenants: MonitoredCovenant[] = DEFAULT_COVENANTS,
  defaultIsAuthorized: boolean = true,
) {
  const [covenants, setCovenants] = useState<MonitoredCovenant[]>(initialCovenants);
  const [isAuthorizedInvestor, setIsAuthorizedInvestor] = useState<boolean>(defaultIsAuthorized);
  const [selectedEvidence, setSelectedEvidence] = useState<CovenantEvidenceRecord | null>(null);

  // Audience filtering (authorized investor vs public view)
  const visibleCovenants = useMemo(() => {
    return filterCovenantsForAudience(covenants, isAuthorizedInvestor);
  }, [covenants, isAuthorizedInvestor]);

  // Overall statistics
  const summaryStats = useMemo(() => {
    let healthy = 0;
    let warning = 0;
    let breached = 0;

    for (const c of covenants) {
      if (c.status === "healthy") healthy++;
      else if (c.status === "warning") warning++;
      else if (c.status === "breached") breached++;
    }

    return {
      total: covenants.length,
      healthy,
      warning,
      breached,
    };
  }, [covenants]);

  const openSecureDoc = useCallback((doc: CovenantEvidenceRecord) => {
    setSelectedEvidence(doc);
  }, []);

  const closeSecureDoc = useCallback(() => {
    setSelectedEvidence(null);
  }, []);

  return {
    covenants: visibleCovenants,
    summaryStats,
    isAuthorizedInvestor,
    setIsAuthorizedInvestor,
    selectedEvidence,
    openSecureDoc,
    closeSecureDoc,
  };
}
