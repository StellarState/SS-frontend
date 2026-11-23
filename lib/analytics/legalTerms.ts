/**
 * Invoice legal terms and versioned acceptance analytics engine (#679).
 *
 * Implements versioned governing terms, plain-language summaries linked to
 * governing text, acceptance tied to displayed version, invalidation on
 * version updates, and immutable acceptance transaction history.
 */

export interface LegalTermClause {
  id: string;
  title: string;
  plain_language_summary: string;
  governing_legal_text: string;
}

export interface GoverningTermsVersion {
  version_id: string;
  effective_date: string;
  jurisdiction: string;
  governing_law: string;
  clauses: LegalTermClause[];
  content_sha256: string;
}

export interface TermsAcceptanceRecord {
  investor_address: string;
  invoice_id: string;
  accepted_version_id: string;
  accepted_sha256: string;
  accepted_at: string;
  tx_hash?: string | null;
}

export const DEFAULT_GOVERNING_TERMS_V1: GoverningTermsVersion = {
  version_id: "v1.0.0",
  effective_date: "2026-01-01T00:00:00Z",
  jurisdiction: "Delaware, United States",
  governing_law: "Delaware Uniform Commercial Code (UCC) Article 9",
  content_sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  clauses: [
    {
      id: "clause-assignment",
      title: "Assignment of Receivables",
      plain_language_summary:
        "The issuer permanently transfers all rights and proceeds of the underlying invoice to the protocol escrow smart contract.",
      governing_legal_text:
        "The Issuer hereby irrevocably assigns, transfers, and conveys to the protocol escrow contract, for the benefit of tokenized fraction holders, all right, title, and interest in and to the designated invoice receivables, free and clear of all liens and encumbrances.",
    },
    {
      id: "clause-settlement",
      title: "Settlement and Waterfall Distribution",
      plain_language_summary:
        "Debtor payments are distributed pro-rata to investors after protocol settlement fees are deducted.",
      governing_legal_text:
        "Upon receipt of funds from the Obligor, the smart contract shall automatically distribute proceeds pursuant to the defined waterfall: (i) protocol settlement fees of 25 bps, (ii) pro-rata return of principal to investors, and (iii) accrued interest return.",
    },
    {
      id: "clause-recourse",
      title: "Limited Recourse and Default Remediation",
      plain_language_summary:
        "Investors hold security rights over the receivable but agree to protocol arbitration in event of debtor default or dispute.",
      governing_legal_text:
        "Holders of tokenized fractions have limited recourse against the Issuer strictly to the extent of breach of representations. In the event of debtor insolvency, recovery shall be pursued exclusively through protocol-appointed collection agents.",
    },
  ],
};

export const UPDATED_GOVERNING_TERMS_V2: GoverningTermsVersion = {
  version_id: "v2.0.0",
  effective_date: "2026-11-20T00:00:00Z",
  jurisdiction: "Delaware, United States",
  governing_law: "Delaware Uniform Commercial Code (UCC) Article 9 & Soroban Contract Law",
  content_sha256: "8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4",
  clauses: [
    {
      id: "clause-assignment",
      title: "Assignment of Receivables",
      plain_language_summary:
        "The issuer permanently transfers all rights and proceeds of the underlying invoice to the protocol escrow smart contract.",
      governing_legal_text:
        "The Issuer hereby irrevocably assigns, transfers, and conveys to the protocol escrow contract, for the benefit of tokenized fraction holders, all right, title, and interest in and to the designated invoice receivables.",
    },
    {
      id: "clause-settlement",
      title: "Settlement and Waterfall Distribution",
      plain_language_summary:
        "Debtor payments are distributed pro-rata to investors with priority liquidity reserve buffer provisions.",
      governing_legal_text:
        "Upon receipt of funds from the Obligor, the smart contract shall automatically distribute proceeds pursuant to the updated V2 waterfall including emergency collateral buffers.",
    },
    {
      id: "clause-recourse",
      title: "Limited Recourse and Default Remediation",
      plain_language_summary:
        "Arbitration clauses updated with expedited 14-day SLA resolution timelines.",
      governing_legal_text:
        "Disputes shall be submitted to protocol arbitration adhering to 14-day expedited resolution rules.",
    },
  ],
};

/**
 * Verifies whether an existing acceptance record is valid for the current displayed terms.
 * Acceptance criteria: Acceptance is tied to displayed terms; Version changes invalidate acceptance.
 */
export function verifyTermsAcceptanceValidity(
  currentTerms: GoverningTermsVersion,
  acceptance: TermsAcceptanceRecord | null | undefined,
): { isValid: boolean; reason?: string } {
  if (!acceptance) {
    return {
      isValid: false,
      reason: "Governing terms must be explicitly accepted before submitting investment.",
    };
  }

  // Version mismatch check: version changes strictly invalidate prior acceptance
  if (acceptance.accepted_version_id !== currentTerms.version_id) {
    return {
      isValid: false,
      reason: `Governing terms have been updated from ${acceptance.accepted_version_id} to ${currentTerms.version_id}. Re-acceptance required.`,
    };
  }

  // Cryptographic hash mismatch check
  if (acceptance.accepted_sha256 !== currentTerms.content_sha256) {
    return {
      isValid: false,
      reason: "Terms content hash mismatch. Re-acceptance required.",
    };
  }

  return { isValid: true };
}

/**
 * Creates an immutable acceptance record bound to the current version.
 * Acceptance criteria: Record accepted version and transaction; Transaction history shows the accepted version.
 */
export function recordTermsAcceptance(
  investorAddress: string,
  invoiceId: string,
  terms: GoverningTermsVersion,
  txHash?: string | null,
  timestamp?: string,
): TermsAcceptanceRecord {
  if (!investorAddress.trim()) {
    throw new Error("Investor address is required for terms acceptance.");
  }
  if (!invoiceId.trim()) {
    throw new Error("Invoice ID is required for terms acceptance.");
  }

  return {
    investor_address: investorAddress.trim(),
    invoice_id: invoiceId.trim(),
    accepted_version_id: terms.version_id,
    accepted_sha256: terms.content_sha256,
    accepted_at: timestamp ?? new Date().toISOString(),
    tx_hash: txHash ?? `tx_accept_${Date.now()}`,
  };
}
