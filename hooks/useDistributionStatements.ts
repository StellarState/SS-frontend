"use client";

import { useState, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useStellarWallet } from "@/hooks/useStellarWallet";
import {
  KeyHolderDistributionStatement,
  SAMPLE_DISTRIBUTION_STATEMENTS,
  calculateTotalsSummary,
  generateDistributionStatementsCsv,
  generateDistributionStatementsPdfText,
  DistributionPeriodType,
  StatementStatus,
} from "@/lib/analytics/distributionStatements";
import { toast } from "sonner";

export interface UseDistributionStatementsOptions {
  keyId?: string;
  initialStatements?: KeyHolderDistributionStatement[];
}

export function useDistributionStatements(options?: UseDistributionStatementsOptions) {
  const { address: authAddress, jwt } = useAuth();
  const { address: walletAddress } = useStellarWallet();
  const activeAddress = authAddress ?? walletAddress;

  const isAuthorized = Boolean(jwt || activeAddress);

  const [statements] = useState<KeyHolderDistributionStatement[]>(
    options?.initialStatements ?? SAMPLE_DISTRIBUTION_STATEMENTS
  );

  const [periodTypeFilter, setPeriodTypeFilter] = useState<
    "all" | DistributionPeriodType
  >("all");
  const [statusFilter, setStatusFilter] = useState<"all" | StatementStatus>(
    "all"
  );
  const [searchQuery, setSearchQuery] = useState("");

  const filteredStatements = useMemo(() => {
    return statements.filter((s) => {
      if (options?.keyId && s.keyId !== options.keyId) {
        return false;
      }
      if (periodTypeFilter !== "all" && s.periodType !== periodTypeFilter) {
        return false;
      }
      if (statusFilter !== "all" && s.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchesPeriod = s.periodLabel.toLowerCase().includes(query);
        const matchesKey = s.keyTitle.toLowerCase().includes(query);
        const matchesId = s.id.toLowerCase().includes(query);
        if (!matchesPeriod && !matchesKey && !matchesId) return false;
      }
      return true;
    });
  }, [statements, options?.keyId, periodTypeFilter, statusFilter, searchQuery]);

  const totals = useMemo(() => {
    return calculateTotalsSummary(filteredStatements);
  }, [filteredStatements]);

  const downloadCsv = useCallback(() => {
    if (!isAuthorized) {
      toast.error("Authorisation required: Please connect your wallet to export statements.");
      return;
    }

    try {
      const csv = generateDistributionStatementsCsv(filteredStatements, isAuthorized);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `keyholder-distribution-statements-${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("CSV export downloaded successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to export CSV";
      toast.error(msg);
    }
  }, [filteredStatements, isAuthorized]);

  const downloadPdf = useCallback(() => {
    if (!isAuthorized) {
      toast.error("Authorisation required: Please connect your wallet to export statements.");
      return;
    }

    try {
      const pdfText = generateDistributionStatementsPdfText(filteredStatements, isAuthorized);
      const blob = new Blob([pdfText], { type: "text/plain;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `keyholder-distribution-statements-${new Date().toISOString().slice(0, 10)}.txt`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("PDF/Accounting statement downloaded successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to export PDF";
      toast.error(msg);
    }
  }, [filteredStatements, isAuthorized]);

  return {
    statements: filteredStatements,
    allStatementsCount: statements.length,
    totals,
    isAuthorized,
    periodTypeFilter,
    setPeriodTypeFilter,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    downloadCsv,
    downloadPdf,
  };
}
