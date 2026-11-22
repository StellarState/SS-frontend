"use client";

import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  GoverningTermsVersion,
  TermsAcceptanceRecord,
  DEFAULT_GOVERNING_TERMS_V1,
  UPDATED_GOVERNING_TERMS_V2,
  verifyTermsAcceptanceValidity,
  recordTermsAcceptance,
} from "@/lib/analytics/legalTerms";

export function useLegalTerms(
  initialTerms: GoverningTermsVersion = DEFAULT_GOVERNING_TERMS_V1,
  initialAcceptance: TermsAcceptanceRecord | null = null,
) {
  const [currentTerms, setCurrentTerms] = useState<GoverningTermsVersion>(initialTerms);
  const [acceptance, setAcceptance] = useState<TermsAcceptanceRecord | null>(initialAcceptance);
  const [hasAgreedCheckbox, setHasAgreedCheckbox] = useState<boolean>(false);
  const [expandedClauseIds, setExpandedClauseIds] = useState<string[]>([]);
  const [acceptanceHistory, setAcceptanceHistory] = useState<TermsAcceptanceRecord[]>(
    initialAcceptance ? [initialAcceptance] : [],
  );

  // Verifies acceptance validity against current displayed terms
  const acceptanceCheck = useMemo(() => {
    return verifyTermsAcceptanceValidity(currentTerms, acceptance);
  }, [currentTerms, acceptance]);

  // Submission is allowed ONLY if checkbox is checked AND acceptance is valid for the current terms
  const isSubmissionReady = hasAgreedCheckbox && acceptanceCheck.isValid;

  // Toggle expanding full governing legal text
  const toggleClause = useCallback((clauseId: string) => {
    setExpandedClauseIds((prev) =>
      prev.includes(clauseId) ? prev.filter((id) => id !== clauseId) : [...prev, clauseId],
    );
  }, []);

  // Accept current version
  const acceptTerms = useCallback(
    (investorAddress: string, invoiceId: string) => {
      try {
        const newRecord = recordTermsAcceptance(investorAddress, invoiceId, currentTerms);
        setAcceptance(newRecord);
        setHasAgreedCheckbox(true);
        setAcceptanceHistory((prev) => [newRecord, ...prev]);
        toast.success(`Governing terms (${currentTerms.version_id}) accepted successfully!`);
        return newRecord;
      } catch (err: any) {
        toast.error(err.message || "Failed to record terms acceptance.");
      }
    },
    [currentTerms],
  );

  // Simulate an upstream version change (e.g. V1 -> V2) to test interrupted flows & invalidation
  const bumpTermsVersion = useCallback((newTerms: GoverningTermsVersion = UPDATED_GOVERNING_TERMS_V2) => {
    setCurrentTerms(newTerms);
    setHasAgreedCheckbox(false);
    toast.warning(
      `Governing terms have been updated to ${newTerms.version_id}. Prior acceptance invalidated.`,
    );
  }, []);

  return {
    currentTerms,
    acceptance,
    hasAgreedCheckbox,
    setHasAgreedCheckbox,
    expandedClauseIds,
    toggleClause,
    acceptanceCheck,
    isSubmissionReady,
    acceptTerms,
    bumpTermsVersion,
    acceptanceHistory,
  };
}
