/**
 * Debtor Organisation Directory Domain Engine (Issue #665).
 *
 * Implements public debtor profiles, data sanitization (excluding private PII/banking),
 * exposure and concentration metrics, and watched debtors preferences.
 */

export interface PublicDebtorDocument {
  id: string;
  title: string;
  verifiedAt: string;
}

export interface DebtorInvoiceSummary {
  id: string;
  invoiceNumber: string;
  amountXLM: number;
  status: "active" | "settled" | "in_dispute";
  dueDate: string;
  settledAt?: string;
}

export interface PublicDebtorProfile {
  id: string;
  name: string;
  jurisdiction: string;
  creditRating: "AAA" | "AA" | "A" | "BBB" | "BB" | "Unrated";
  status: "Trusted" | "Neutral" | "Watch" | "Blocked";
  totalInvoicesCount: number;
  settledInvoicesCount: number;
  defaultRatePercent: number;
  totalExposureXLM: number;
  activeObligationsXLM: number;
  settledVolumeXLM: number;
  approvedAttestations: string[];
  publicDocuments: PublicDebtorDocument[];
  recentInvoices: DebtorInvoiceSummary[];
}

export interface RawDebtorRecord {
  id: string;
  name: string;
  jurisdiction: string;
  creditRating?: string;
  status?: string;
  // Private / Sensitive Fields (MUST BE STRIPPED)
  taxId?: string;
  bankAccountIban?: string;
  routingNumber?: string;
  internalRiskScore?: number;
  privateOfficerEmail?: string;
  kycDocRawUri?: string;
  // Public data
  invoices?: DebtorInvoiceSummary[];
  approvedAttestations?: string[];
  publicDocuments?: PublicDebtorDocument[];
}

/**
 * Sanitizes a debtor record to strictly return public approved data.
 * Drops tax identifiers, bank accounts, and private contact info.
 */
export function sanitizePublicDebtorProfile(raw: RawDebtorRecord): PublicDebtorProfile {
  const invoices = raw.invoices || [];
  const settled = invoices.filter((i) => i.status === "settled");
  const active = invoices.filter((i) => i.status === "active");

  const settledVolumeXLM = settled.reduce((sum, i) => sum + i.amountXLM, 0);
  const activeObligationsXLM = active.reduce((sum, i) => sum + i.amountXLM, 0);
  const totalExposureXLM = activeObligationsXLM;

  const totalInvoicesCount = invoices.length;
  const settledInvoicesCount = settled.length;
  const defaultedCount = invoices.filter((i) => i.status === "in_dispute").length;
  const defaultRatePercent =
    totalInvoicesCount > 0 ? (defaultedCount / totalInvoicesCount) * 100 : 0;

  const rating = (raw.creditRating || "Unrated") as PublicDebtorProfile["creditRating"];
  const status = (raw.status || "Neutral") as PublicDebtorProfile["status"];

  return {
    id: raw.id,
    name: raw.name.trim(),
    jurisdiction: (raw.jurisdiction || "Global").trim(),
    creditRating: ["AAA", "AA", "A", "BBB", "BB", "Unrated"].includes(rating)
      ? rating
      : "Unrated",
    status: ["Trusted", "Neutral", "Watch", "Blocked"].includes(status)
      ? status
      : "Neutral",
    totalInvoicesCount,
    settledInvoicesCount,
    defaultRatePercent: Math.round(defaultRatePercent * 10) / 10,
    totalExposureXLM,
    activeObligationsXLM,
    settledVolumeXLM,
    approvedAttestations: raw.approvedAttestations || ["Proof of Business Registry"],
    publicDocuments: raw.publicDocuments || [],
    recentInvoices: invoices.slice(0, 10),
  };
}

export const WATCHED_DEBTORS_STORAGE_KEY = "ss-watched-debtor-ids";

/**
 * Toggles a debtor in the investor's watched list.
 */
export function toggleWatchedDebtor(
  currentWatchedIds: string[],
  debtorId: string,
): string[] {
  if (currentWatchedIds.includes(debtorId)) {
    return currentWatchedIds.filter((id) => id !== debtorId);
  }
  return [...currentWatchedIds, debtorId];
}

export function isDebtorWatched(
  currentWatchedIds: string[],
  debtorId: string,
): boolean {
  return currentWatchedIds.includes(debtorId);
}

/**
 * Calculates portfolio concentration percentage for a debtor.
 */
export function calculateConcentrationPercentage(
  debtorExposureXLM: number,
  totalPortfolioExposureXLM: number,
): number {
  if (totalPortfolioExposureXLM <= 0) return 0;
  return Math.min(100, Math.round((debtorExposureXLM / totalPortfolioExposureXLM) * 1000) / 10);
}
