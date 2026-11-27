"use client";

import { useState, useEffect, useCallback } from "react";

export const CURRENT_TERMS_VERSION = "2.1.0";
export const STORAGE_KEY_AGREEMENTS = "ss_accepted_agreements";

export interface AcceptedAgreementRecord {
  version: string;
  acceptedAt: string; // ISO date string
  termsTitle: string;
  confirmationId: string;
  downloadUrl?: string;
}

export interface TermsContent {
  version: string;
  title: string;
  effectiveDate: string;
  sections: Array<{ heading: string; body: string }>;
  fullText: string;
}

export const CURRENT_TERMS_CONTENT: TermsContent = {
  version: CURRENT_TERMS_VERSION,
  title: "StellarState Master Investor & Invoice Participation Agreement",
  effectiveDate: "2026-11-01",
  sections: [
    {
      heading: "1. Scope and Acceptance of Terms",
      body: "By participating in invoice financing on the StellarState platform, the investor agrees to be bound by these Master Terms and Conditions. These terms govern all invoice purchase commitments, yield distributions, settlement flows, and secondary market transactions initiated through the platform.",
    },
    {
      heading: "2. Investment Risks and Absence of Guarantee",
      body: "Invoice factoring and receivables financing involve significant financial risk, including but not limited to the potential total loss of invested principal. StellarState does not act as an insurer, guarantor, or fiduciary. Yield rates, settlement dates, and historical payment performance are illustrative and do not guarantee future performance.",
    },
    {
      heading: "3. Settlement Waterfall and Priority of Payments",
      body: "Upon debtor repayment, funds are distributed strictly in accordance with the smart contract settlement waterfall: first to repay platform protocol fees and network gas costs, second to pro-rata senior tranche participants, and third to subordinated or junior tranche participants according to the invoice listing specification.",
    },
    {
      heading: "4. Liquidity, Fractional Interests, and Secondary Trading",
      body: "Purchased invoice fractions are illiquid assets. While StellarState provides secondary market facilities, there is no assurance that an active market will exist or that you will be able to exit your position prior to the debtor's final invoice maturity.",
    },
    {
      heading: "5. Tax Withholding and Regulatory Disclosures",
      body: "Investors are solely responsible for all tax liabilities arising from yield distributions. Investors certify that their submitted tax identification numbers and residency declarations are accurate under penalties of perjury. In the event of missing or invalid tax documentation, payouts may be subject to mandatory regulatory backup withholding.",
    },
    {
      heading: "6. Dispute Resolution and Governing Law",
      body: "Any dispute, claim, or controversy arising out of or relating to this Agreement or platform transactions shall be resolved by binding arbitration under international commercial rules. Users waive any right to participate in class-action lawsuits against StellarState or partner protocols.",
    },
  ],
  fullText: "", // populated below
};

CURRENT_TERMS_CONTENT.fullText = CURRENT_TERMS_CONTENT.sections
  .map((s) => `${s.heading}\n${s.body}`)
  .join("\n\n");

export function useAgreement(activeVersion: string = CURRENT_TERMS_VERSION) {
  const [acceptedAgreements, setAcceptedAgreements] = useState<AcceptedAgreementRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadAgreements = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_AGREEMENTS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setAcceptedAgreements(parsed);
        }
      } else {
        setAcceptedAgreements([]);
      }
    } catch {
      setAcceptedAgreements([]);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadAgreements();
  }, [loadAgreements]);

  const acceptedCurrent = acceptedAgreements.find((a) => a.version === activeVersion);
  const hasAcceptedCurrentVersion = Boolean(acceptedCurrent);
  const latestAcceptedVersion = acceptedAgreements.length > 0 ? acceptedAgreements[0].version : null;

  const acceptAgreement = useCallback(
    (versionToAccept: string = activeVersion): AcceptedAgreementRecord => {
      const now = new Date().toISOString();
      const confirmationId = `AGR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const newRecord: AcceptedAgreementRecord = {
        version: versionToAccept,
        acceptedAt: now,
        termsTitle: CURRENT_TERMS_CONTENT.title,
        confirmationId,
      };

      setAcceptedAgreements((prev) => {
        const filtered = prev.filter((item) => item.version !== versionToAccept);
        const updated = [newRecord, ...filtered];
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY_AGREEMENTS, JSON.stringify(updated));
        }
        return updated;
      });

      return newRecord;
    },
    [activeVersion]
  );

  const downloadAgreement = useCallback((record: AcceptedAgreementRecord | string) => {
    const version = typeof record === "string" ? record : record.version;
    const content = `STELLARSTATE INVESTOR PARTICIPATION AGREEMENT\nVersion: ${version}\nDownloaded: ${new Date().toISOString()}\n\n` +
      CURRENT_TERMS_CONTENT.fullText;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `StellarState-Terms-v${version}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const isInvestingBlocked = !hasAcceptedCurrentVersion;
  const investingBlockReason = !hasAcceptedCurrentVersion
    ? `Investment agreement terms (v${activeVersion}) must be reviewed and accepted before investing.`
    : null;

  return {
    isLoaded,
    currentVersion: activeVersion,
    currentTerms: CURRENT_TERMS_CONTENT,
    acceptedAgreements,
    hasAcceptedCurrentVersion,
    latestAcceptedVersion,
    acceptAgreement,
    downloadAgreement,
    isInvestingBlocked,
    investingBlockReason,
    reload: loadAgreements,
  };
}
