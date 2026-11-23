"use client";

import { useState, useMemo, useCallback } from "react";
import {
  WalletAccountProfile,
  WalletSignatureProof,
  MergeConflict,
  MergeAuditReceipt,
  generateMergeChallenge,
  detectMergeConflicts,
  executeAccountMerge,
  SAMPLE_PRIMARY_ACCOUNT,
  SAMPLE_COMPATIBLE_SECONDARY,
  SAMPLE_CONFLICTING_SECONDARY,
} from "@/lib/security/accountMerge";

export interface UseAccountMergeWizardOptions {
  initialPrimary?: WalletAccountProfile;
  initialSecondary?: WalletAccountProfile;
}

export function useAccountMergeWizard(options?: UseAccountMergeWizardOptions) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [primaryAccount, setPrimaryAccount] = useState<WalletAccountProfile>(
    options?.initialPrimary ?? SAMPLE_PRIMARY_ACCOUNT
  );
  const [secondaryAccount, setSecondaryAccount] = useState<WalletAccountProfile>(
    options?.initialSecondary ?? SAMPLE_COMPATIBLE_SECONDARY
  );

  const [primarySig, setPrimarySig] = useState<WalletSignatureProof | null>(null);
  const [secondarySig, setSecondarySig] = useState<WalletSignatureProof | null>(null);
  const [auditReceipt, setAuditReceipt] = useState<MergeAuditReceipt | null>(null);
  const [revokedSessions, setRevokedSessions] = useState<string[]>([]);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState(false);

  const conflicts = useMemo(() => {
    return detectMergeConflicts(primaryAccount, secondaryAccount);
  }, [primaryAccount, secondaryAccount]);

  const hasBlockingConflict = useMemo(() => {
    return conflicts.some((c) => c.severity === "blocking");
  }, [conflicts]);

  const challenge = useMemo(() => {
    return generateMergeChallenge(primaryAccount.publicKey, secondaryAccount.publicKey);
  }, [primaryAccount.publicKey, secondaryAccount.publicKey]);

  const signPrimaryWallet = useCallback(async () => {
    const proof: WalletSignatureProof = {
      publicKey: primaryAccount.publicKey,
      challenge,
      signature: `SIG-PRIM-OK-998811-${primaryAccount.publicKey.slice(0, 10)}`,
      timestamp: new Date().toISOString(),
      verified: true,
    };
    setPrimarySig(proof);
  }, [primaryAccount.publicKey, challenge]);

  const signSecondaryWallet = useCallback(async () => {
    const proof: WalletSignatureProof = {
      publicKey: secondaryAccount.publicKey,
      challenge,
      signature: `SIG-SEC-OK-112233-${secondaryAccount.publicKey.slice(0, 10)}`,
      timestamp: new Date().toISOString(),
      verified: true,
    };
    setSecondarySig(proof);
  }, [secondaryAccount.publicKey, challenge]);

  const executeMerge = useCallback(() => {
    if (!primarySig || !secondarySig) {
      setMergeError("Both wallet cryptographic signatures are strictly required.");
      return { success: false, error: "Signatures missing" };
    }

    setIsMerging(true);
    setMergeError(null);

    const result = executeAccountMerge(
      primaryAccount,
      secondaryAccount,
      primarySig,
      secondarySig
    );

    setIsMerging(false);

    if (result.success && result.auditReceipt) {
      setAuditReceipt(result.auditReceipt);
      setRevokedSessions(result.revokedSessions || []);
      setStep(4);
      return { success: true };
    } else {
      setMergeError(result.error || "Account merge failed.");
      return { success: false, error: result.error };
    }
  }, [primaryAccount, secondaryAccount, primarySig, secondarySig]);

  const loadScenario = useCallback((scenario: "compatible" | "conflict") => {
    setPrimarySig(null);
    setSecondarySig(null);
    setAuditReceipt(null);
    setMergeError(null);
    setStep(1);
    if (scenario === "compatible") {
      setSecondaryAccount(SAMPLE_COMPATIBLE_SECONDARY);
    } else {
      setSecondaryAccount(SAMPLE_CONFLICTING_SECONDARY);
    }
  }, []);

  return {
    step,
    setStep,
    primaryAccount,
    secondaryAccount,
    setSecondaryAccount,
    conflicts,
    hasBlockingConflict,
    challenge,
    primarySig,
    secondarySig,
    signPrimaryWallet,
    signSecondaryWallet,
    executeMerge,
    auditReceipt,
    revokedSessions,
    mergeError,
    isMerging,
    loadScenario,
  };
}
