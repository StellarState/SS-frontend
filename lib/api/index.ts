import { parseInvestError } from "@/lib/investCurrency";
import type { InvestmentPosition } from "@/lib/portfolio";
import type { KycTier } from "@/lib/kycTier";
import type { IssuerProfile } from "@/lib/issuers";

export type { KycTier, IssuerProfile };

export interface Invoice {
  id: string;
  title: string;
  seller: string;
  amount: number;
  raised: number;
  investor_count: number;
  status: "draft" | "pending" | "open" | "funded" | "settled" | "rejected" | "defaulted";
  due_date: string;
  yield_percentage?: number;
  /** Price of one fraction in XLM; the calculator assumes 1 XLM when absent. */
  fraction_price?: number;
  /** Minimum investment amount in XLM required for this invoice (#436). */
  min_investment?: number;
  /** Amount the invoice must raise before it can proceed (#462). */
  min_funding_threshold?: number | null;
  /** Maximum the invoice will accept; falls back to `amount` when absent (#462). */
  max_funding_cap?: number | null;
  rejection_reason?: string;
  /** Risk grade (A = safest). Used to gate investing by suitability tier (#391). */
  risk_rating?: { tier: "A" | "B" | "C" | "D"; score?: number };
  /** Industry sector, for the marketplace taxonomy filter (#420). */
  category?: string;
  /** Coarser risk grouping derived from `risk_rating.tier` (#420). */
  risk_tier?: string;
  /** Geographic region of the underlying receivable (#420). */
  region?: string;
  /** Free-form tags chosen by the issuer at publish time (#420). */
  tags?: string[];
  /** When the invoice reached `funded`, for the 24h velocity window (#421). */
  funded_at?: string | null;
  /** When the invoice settled; present only on settled invoices (#423). */
  settled_at?: string | null;
  /** Amount committed in the 24h before now, for the velocity badge (#421). */
  raised_last_24h?: number;
  /** Human-facing invoice number used by search results (#294). */
  invoice_number?: string;
  /** Creation timestamp, used by search/sort helpers (#294). */
  created_at?: string;
  has_more: boolean;
  next_cursor: string | null;
  /** Issuer reputation 0-100; absent when the issuer has no settlement history. */
  issuer_score?: number;
  /** Settlement maturity date once an invoice is funded (issue #314). Optional
   * because older backend responses may not populate it yet — UI must
   * degrade gracefully when absent rather than assume it's always present. */
  maturity_date?: string | null;
  /** Late penalty accrued on-chain after the grace period (issue #498). */
  late_penalty_accrued?: number | null;
  /** Sector yield benchmark returned alongside the list, for the card chip (#530). */
  sector_benchmark?: SectorBenchmark | null;
  /** Optional compliance hold returned by the invoice API. */
  greylist?: { reason?: string | null; clears_at?: string | null } | null;
  /** Optional tranche state returned for invoices using the tranche contract. */
  tranche_status?: {
    senior_pct: number; junior_pct: number; senior_filled: number;
    junior_filled: number; junior_yield_premium_bps: number; is_settled: boolean;
  } | null;
  impact_report?: { type: "environmental" | "social" | "governance" | "combined"; metrics_hash: string; verified: boolean; submitted_at?: string } | null;
}

/** Sector average yield and how many invoices it was computed from (#530). */
export interface SectorBenchmark {
  sector_avg_yield: number | null;
  sample_size: number;
}

/** Category tabs on the marketplace homepage (#452). */
export const INVOICE_CATEGORIES = [
  "all",
  "trade_finance",
  "real_estate",
  "sme",
] as const;

export type InvoiceCategory = (typeof INVOICE_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<InvoiceCategory, string> = {
  all: "All",
  trade_finance: "Trade Finance",
  real_estate: "Real Estate",
  sme: "SME",
};

/**
 * Maps an invoice's raw category onto a known tab, defaulting to `all`.
 *
 * Backends spell the same sector several ways ("trade_finance",
 * "trade-finance", "Trade Receivable"), and the resale endpoint uses its own
 * taxonomy (`trade_receivable`, `supply_chain`, `promissory_note`, …). Those
 * collapse into the three tabs investors actually browse by.
 */
export function resolveInvoiceCategory(
  raw: unknown,
): Exclude<InvoiceCategory, "all"> | null {
  const v = String(raw ?? "")
    .toLowerCase()
    .replace(/[-\s]+/g, "_");
  if (!v) return null;
  if (
    v.includes("trade") ||
    v.includes("receivable") ||
    v.includes("supply_chain")
  ) {
    return "trade_finance";
  }
  if (
    v.includes("real_estate") ||
    v.includes("property") ||
    v.includes("mortgage")
  ) {
    return "real_estate";
  }
  if (
    v.includes("sme") ||
    v.includes("small") ||
    v.includes("promissory") ||
    v.includes("service") ||
    v.includes("equipment") ||
    v.includes("lease")
  ) {
    return "sme";
  }
  return null;
}

export interface InvoiceDetail extends Invoice {
  description: string;
  investors: { address: string; amount: number; timestamp: string }[];
  document_url: string;
  /** Any supporting documents beyond the primary one. */
  documents?: string[];
  early_repayment?: {
    amount: number;
    original_maturity_date: string;
    new_settlement_date: string;
  };
  risk_rating?: {
    tier: "A" | "B" | "C" | "D";
    score: number;
    breakdown: {
      seller_history: number;
      invoice_age: number;
      amount: number;
      sector: number;
    };
  };
}

export interface IssuerCreditScore {
  tier: "C" | "B" | "A" | "AA" | "AAA";
  score: number;
  factors: Record<string, number>;
}

export async function fetchIssuerCreditScore(wallet: string): Promise<IssuerCreditScore | null> {
  const res = await fetch(`${API_BASE}/issuers/${encodeURIComponent(wallet)}/credit-score`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch issuer credit score");
  return res.json();
}

export interface DynamicYieldResponse {
  current_rate: number;
  base_rate: number;
  settlement_count: number;
  adjustment_history: { rate: number; effective_at: string; reason?: string }[];
}

export async function fetchDynamicYield(wallet: string): Promise<DynamicYieldResponse | null> {
  const res = await fetch(`${API_BASE}/issuers/${encodeURIComponent(wallet)}/dynamic-yield`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch issuer yield history");
  return res.json();
}

export interface InvoicesResponse {
  invoices: Invoice[];
  has_more: boolean;
  next_cursor: string | null;
}

export type ActivityEventType =
  | "investment"
  | "secondary_buy"
  | "secondary_sell"
  | "transfer"
  | "settlement"
  | "kyc_submitted"
  | "kyc_approved"
  | "kyc_rejected";

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  description: string;
  amount: number | null;
  currency: string;
  timestamp: string;
  related_id: string | null;
  metadata: Record<string, unknown>;
}

export interface ActivityResponse {
  events: ActivityEvent[];
  has_more: boolean;
  next_cursor: string | null;
}

export interface PortfolioSummary {
  total_invested: number;
  total_yield_earned: number;
  active_holdings_count: number;
}

export interface UpcomingMaturity {
  invoice_id: string;
  title: string;
  amount: number;
  due_date: string;
  days_remaining: number;
}

/**
 * One row from the on-chain watchlist registry (#474).
 *
 * The registry contract keys entries by investor address; the backend indexes
 * it and exposes it over HTTP, which is why the address is an explicit input
 * to every call below rather than being inferred from a session.
 */
export interface WatchlistRegistryEntry {
  invoice_id: string;
  added_at: string;
  /** Status the investor last acknowledged for this invoice. */
  last_seen_status?: Invoice["status"] | null;
  /** When the registry observed the invoice's most recent transition. */
  last_state_change_at?: string | null;
}

export interface WatchlistRegistryResponse {
  items: WatchlistRegistryEntry[];
}

export interface BusinessDetails {
  company_name: string;
  registration_number: string;
  country: string;
  address: string;
}

export interface DirectorDetails {
  name: string;
  id_document_url: string;
  date_of_birth: string;
}

export interface RegulatoryDocuments {
  certificate_of_incorporation_url: string;
  tax_id_url: string;
  bank_statement_url: string;
}

export interface KycSubmission {
  business_details: BusinessDetails;
  director_details: DirectorDetails;
  regulatory_documents: RegulatoryDocuments;
}

export interface BusinessKycStatus {
  status: "pending" | "approved" | "rejected" | "not_started";
  submitted_at: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
}

/** Admin/user KYC state, as shown in the admin users table. Distinct from the
 * business-KYC `BusinessKycStatus` document status above. */
export type KycStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "flagged"
  | "not_submitted";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

/**
 * Raised by API helpers when the server reports the resource is absent, so
 * callers can render a 404 state instead of a generic failure.
 */
export class ApiNotFoundError extends Error {
  readonly status: number;

  constructor(message = "Not found") {
    super(message);
    this.name = "ApiNotFoundError";
    this.status = 404;
  }
}

export interface FeatureComponent142Input {
  label?: string;
  metadata?: Record<string, unknown>;
}

export interface FeatureComponent142State {
  label: string;
  metadata: Record<string, unknown>;
  ready: boolean;
}

/* Placeholder helper for the generated FeatureComponent142 stub. */
function helperFunction142(label: string): string {
  return label.trim();
}

export function FeatureComponent142(
  input: FeatureComponent142Input = {},
): FeatureComponent142State {
  const label = helperFunction142(input.label ?? "New Feature 142");

  return {
    label,
    metadata: input.metadata ?? {},
    ready: label.length > 0,
  };
}

export async function fetchInvoices(
  cursor?: string,
  paramsObj?: Record<string, string>,
): Promise<InvoicesResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  if (paramsObj) {
    Object.entries(paramsObj).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
  }
  const res = await fetch(`${API_BASE}/invoices?${params}`);
  if (!res.ok) throw new Error("Failed to fetch invoices");
  return res.json();
}

export async function fetchInvoiceDetail(id: string): Promise<InvoiceDetail> {
  const res = await fetch(`${API_BASE}/invoices/${id}`);
  if (res.status === 404) throw new ApiNotFoundError("Invoice not found");
  if (!res.ok) throw new Error("Failed to fetch invoice detail");
  return res.json();
}

/** Fetches a public issuer profile, including its full invoice history. */
export async function fetchIssuerProfile(id: string): Promise<IssuerProfile> {
  const res = await fetch(`${API_BASE}/issuers/${encodeURIComponent(id)}`);
  if (res.status === 404) throw new ApiNotFoundError("Issuer not found");
  if (!res.ok) throw new Error("Failed to fetch issuer profile");
  return res.json();
}

/** Protocol-wide status, including the minimum investment floor the contract
 * enforces (issue #116) ? must be read from here rather than hardcoded, since
 * it can change independently of any one invoice. */
export async function fetchProtocolStatus(): Promise<ProtocolStatus> {
  const res = await fetch(`${API_BASE}/protocol/status`);
  if (!res.ok) throw new Error("Failed to fetch protocol status");
  return res.json();
}

export interface XlmUsdRate {
  rate: number;
}

/** Live XLM/USD exchange rate for the currency toggle. */
export async function fetchXlmUsdRate(): Promise<XlmUsdRate> {
  const res = await fetch(`${API_BASE}/rates/xlm-usd`);
  if (!res.ok) throw new Error("Failed to fetch XLM/USD rate");
  return res.json();
}

/**
 * FX oracle rates for the display-currency toggle (#504): the value of 1 XLM
 * in USDC, EURC and NGNC, plus when the oracle last updated.
 */
export interface FxRatesResponse {
  rates: { USD?: number; EUR?: number; NGN?: number };
  updated_at: string;
}

export async function fetchFxRates(): Promise<FxRatesResponse> {
  const res = await fetch(`${API_BASE}/rates/fx`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch FX rates");
  return res.json();
}

export interface InvestInInvoiceResult {
  success: boolean;
  invested_amount: number;
  /** Soroban transaction hash for the invest call, when the backend
   * populates it (issue #310) — used to link out to the block explorer.
   * Optional so older backend responses without it degrade gracefully. */
  tx_hash?: string;
}

export async function investInInvoice(
  invoiceId: string,
  amount: number,
  currency?: string,
  trancheType?: 1 | 2,
): Promise<InvestInInvoiceResult> {
  const res = await fetch(`${API_BASE}/invoices/${invoiceId}/invest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, ...(currency ? { currency } : {}), ...(trancheType ? { tranche_type: trancheType } : {}) }),
  });
  if (!res.ok) {
    if (currency) {
      throw parseInvestError(await res.json().catch(() => null));
    }
    throw new Error("Investment failed");
  }
  return res.json();
}

export async function fetchActivity(
  cursor?: string,
  type?: ActivityEventType,
  startDate?: string,
  endDate?: string,
): Promise<ActivityResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  if (type) params.set("type", type);
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  const res = await fetch(`${API_BASE}/activity?${params}`);
  if (!res.ok) throw new Error("Failed to fetch activity");
  return res.json();
}

export async function fetchPortfolioSummary(): Promise<PortfolioSummary> {
  const res = await fetch(`${API_BASE}/portfolio/summary`);
  if (!res.ok) throw new Error("Failed to fetch portfolio summary");
  return res.json();
}

export async function fetchRecentActivity(limit = 5): Promise<ActivityEvent[]> {
  const res = await fetch(
    `${API_BASE}/portfolio/recent-activity?limit=${limit}`,
  );
  if (!res.ok) throw new Error("Failed to fetch recent activity");
  return res.json();
}

export async function fetchUpcomingMaturities(
  limit = 3,
): Promise<UpcomingMaturity[]> {
  const res = await fetch(
    `${API_BASE}/portfolio/upcoming-maturities?limit=${limit}`,
  );
  if (!res.ok) throw new Error("Failed to fetch upcoming maturities");
  return res.json();
}

/**
 * Reads the connected wallet's watchlist from the on-chain registry.
 *
 * The registry is the source of truth, so this is the only list the UI treats
 * as authoritative; a local cache is only ever an optimistic overlay on top of
 * it (see `useWatchlist`).
 */
export async function fetchWatchlistRegistry(
  address: string,
  token?: string,
): Promise<WatchlistRegistryResponse> {
  const params = new URLSearchParams({ address });
  const res = await fetch(`${API_BASE}/watchlist?${params.toString()}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch watchlist registry");
  return res.json();
}

/** Submits the `watch` registry call for the connected wallet. */
export async function watchInvoiceOnRegistry(
  address: string,
  invoiceId: string,
  token?: string,
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/watchlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ address, invoice_id: invoiceId }),
  });
  if (!res.ok) throw new Error("Failed to add invoice to watchlist registry");
  return res.json();
}

/** Submits the `unwatch` registry call for the connected wallet. */
export async function unwatchInvoiceOnRegistry(
  address: string,
  invoiceId: string,
  token?: string,
): Promise<{ success: boolean }> {
  const params = new URLSearchParams({ address });
  const res = await fetch(
    `${API_BASE}/watchlist/${encodeURIComponent(invoiceId)}?${params.toString()}`,
    {
      method: "DELETE",
      headers: authHeaders(token),
    },
  );
  if (!res.ok) throw new Error("Failed to remove invoice from watchlist registry");
  return res.json();
}

/** Business/director KYC (KycOnboarding). Distinct from the seller
 * document-upload flow's `submitKyc`, which posts multipart FormData
 * instead of a JSON body. */
export async function submitBusinessKyc(
  data: KycSubmission,
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/kyc/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to submit KYC");
  return res.json();
}

export async function fetchKycStatus(): Promise<BusinessKycStatus> {
  const res = await fetch(`${API_BASE}/kyc/status`);
  if (!res.ok) throw new Error("Failed to fetch KYC status");
  return res.json();
}

/* ─── Issuer KYC documents (issue #469) ─────────────────────────────────── */

export const KYC_DOCUMENT_TYPES = [
  "business_registration",
  "director_id",
  "proof_of_address",
] as const;

export type KycDocumentType = (typeof KYC_DOCUMENT_TYPES)[number];

export type KycDocumentState = "pending" | "approved" | "rejected" | "expired";

export interface KycDocumentStatus {
  type: KycDocumentType;
  status: KycDocumentState;
  submitted_at: string | null;
  /** When an admin approved the document. */
  verified_at: string | null;
  /** When an approved document stops being valid. */
  expires_at: string | null;
  rejection_reason: string | null;
}

const KYC_DOCUMENT_STATES: KycDocumentState[] = [
  "pending",
  "approved",
  "rejected",
  "expired",
];

function normalizeKycDocument(raw: any): KycDocumentStatus | null {
  const type = raw?.type ?? raw?.document_type ?? raw?.documentType;
  if (!(KYC_DOCUMENT_TYPES as readonly string[]).includes(type)) return null;
  const rawStatus = String(raw.status ?? "").toLowerCase();
  return {
    type,
    status: KYC_DOCUMENT_STATES.includes(rawStatus as KycDocumentState)
      ? (rawStatus as KycDocumentState)
      : "pending",
    submitted_at: raw.submitted_at ?? raw.submittedAt ?? null,
    verified_at: raw.verified_at ?? raw.verifiedAt ?? raw.reviewed_at ?? null,
    expires_at: raw.expires_at ?? raw.expiresAt ?? raw.expiry_date ?? null,
    rejection_reason:
      raw.rejection_reason ?? raw.rejectionReason ?? raw.reason ?? null,
  };
}

/** Verification state of each issuer KYC document. Unknown types are dropped. */
export async function fetchKycDocuments(
  token?: string,
): Promise<KycDocumentStatus[]> {
  const res = await fetch(`${API_BASE}/kyc/documents`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch KYC documents");
  const payload = await res.json();
  const docs = Array.isArray(payload) ? payload : (payload.documents ?? []);
  return docs
    .map(normalizeKycDocument)
    .filter((d: KycDocumentStatus | null): d is KycDocumentStatus => d !== null);
}

/**
 * Replaces a rejected or expired document with a newly uploaded one. The
 * backend resets the document to `pending`; that is assumed if it omits it.
 */
export async function resubmitKycDocument(
  type: KycDocumentType,
  documentUrl: string,
  token?: string,
): Promise<KycDocumentStatus> {
  const res = await fetch(
    `${API_BASE}/kyc/documents/${encodeURIComponent(type)}/resubmit`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(token) },
      body: JSON.stringify({ document_url: documentUrl }),
    },
  );
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, "Failed to resubmit document"));
  }
  const payload = await res.json().catch(() => null);
  return (
    normalizeKycDocument({ type, ...payload, status: payload?.status ?? "pending" }) ?? {
      type,
      status: "pending",
      submitted_at: new Date().toISOString(),
      verified_at: null,
      expires_at: null,
      rejection_reason: null,
    }
  );
}

export async function uploadDocument(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to upload document");
  return res.json();
}

export interface PublishInvoiceInput {
  title: string;
  description: string;
  faceValue: number;
  fundingDeadline: string;
  documentCid: string;
}

export interface PublishInvoiceResult {
  id: string;
}

export async function publishInvoice(
  input: PublishInvoiceInput,
  token?: string,
): Promise<PublishInvoiceResult> {
  const res = await fetch(`${API_BASE}/invoices`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Failed to publish invoice");
  return res.json();
}

export interface UpdateInvoiceInput {
  title?: string;
  description?: string;
  faceValue?: number;
  fundingDeadline?: string;
  documentCid?: string;
}

/** Partial update of a draft invoice from the edit form. */
export async function updateInvoice(
  invoiceId: string,
  input: UpdateInvoiceInput,
  token?: string,
): Promise<InvoiceDetail> {
  const res = await fetch(
    `${API_BASE}/invoices/${encodeURIComponent(invoiceId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders(token) },
      body: JSON.stringify(input),
    },
  );
  if (!res.ok) throw new Error("Failed to update invoice");
  return res.json();
}

export interface PortfolioResponse {
  positions: InvestmentPosition[];
}

export async function fetchPortfolio(): Promise<PortfolioResponse> {
  const res = await fetch(`${API_BASE}/investor/portfolio`);
  if (!res.ok) throw new Error("Failed to fetch portfolio");
  return res.json();
}

export interface SellerDashboardData {
  total_invoices: number;
  total_funded: number;
  total_settled: number;
  total_raised: number;
  invoices: Invoice[];
  display_name?: string | null;
  displayName?: string | null;
  avatar_url?: string | null;
  avatarUrl?: string | null;
}

export async function fetchSellerDashboard(): Promise<SellerDashboardData> {
  const res = await fetch(`${API_BASE}/seller/analytics`);
  if (!res.ok) throw new Error("Failed to fetch seller dashboard");
  return res.json();
}

export async function submitKyc(data: FormData): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/kyc/submit`, {
    method: "POST",
    body: data,
  });
  if (!res.ok) throw new Error("KYC submission failed");
  return res.json();
}

export type SellerKycStatusValue =
  | "pending"
  | "rejected"
  | "approved"
  | "requires_resubmission"
  | "not_submitted";

export interface SellerKycSubmission {
  fullName: string;
  country: string;
  idType: string;
}

export interface SellerKycStatus {
  status: SellerKycStatusValue;
  rejection_reason?: string | null;
  rejectionReason?: string | null;
  reason?: string | null;
  previousSubmission?: SellerKycSubmission | null;
}

function normalizeSellerKycStatus(raw: any): SellerKycStatus {
  const submission = raw.previous_submission ?? raw.previousSubmission ?? null;
  return {
    status: raw.status ?? raw.kyc_status ?? raw.kycStatus ?? "not_submitted",
    rejection_reason:
      raw.rejection_reason ?? raw.rejectionReason ?? raw.reason ?? null,
    previousSubmission: submission
      ? {
          fullName: submission.full_name ?? submission.fullName ?? "",
          country: submission.country ?? "",
          idType: submission.id_type ?? submission.idType ?? "",
        }
      : null,
  };
}

export async function fetchSellerKycStatus(
  token?: string,
): Promise<SellerKycStatus> {
  const res = await fetch(`${API_BASE}/kyc/status`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch KYC status");
  return normalizeSellerKycStatus(await res.json());
}

/**
 * On-chain KYC tier status (#475).
 *
 * The `kyc_tier` contract records the tier for each investor address and the
 * registrar keeps the running commitment totals used here; the backend exposes
 * a read-only view of it. The wallet address is therefore an explicit input —
 * the tier is a property of the address, not of this browser session.
 */
export interface KycTierStatus {
  address: string;
  tier: KycTier;
  /** Total committed across all invoices, in XLM. */
  cumulative_invested: number;
  /** Largest single-invoice commitment held, in XLM. */
  largest_commitment: number;
  /** Per-invoice cap at this tier; `null` when uncapped. */
  per_invoice_limit?: number | null;
  /** Cumulative cap at this tier; `null` when uncapped. */
  cumulative_limit?: number | null;
  updated_at: string;
}

export async function fetchKycTierStatus(
  address: string,
  token?: string,
): Promise<KycTierStatus> {
  const params = new URLSearchParams({ address });
  const res = await fetch(`${API_BASE}/kyc/tier?${params.toString()}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch KYC tier status");
  return res.json();
}

export type NotificationEventType =
  | "new_invoice"
  | "funding_milestone"
  | "settlement"
  | "invoice_funded"
  | "invoice_settled"
  | "invoice_rejected"
  | "deadline_extended"
  | "invoice_matured";
export type NotificationChannel = "email" | "in_app";

export async function updateNotificationPreference(
  eventType: NotificationEventType,
  channel: NotificationChannel,
  enabled: boolean,
): Promise<{ success: boolean }> {
  const res = await fetch(
    `${API_BASE}/notifications/preferences/${eventType}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel, enabled }),
    },
  );
  if (!res.ok) throw new Error("Failed to update notification preference");
  return res.json();
}

/* ─── Notification centre (issue #283) ──────────────────────────────────── */

export interface NotificationItem {
  id: string;
  /** Short notification title, e.g. "Invoice fully funded". */
  title?: string;
  /** Alternative message field some backend versions return. */
  message?: string;
  /** Optional longer body text. */
  body?: string;
  /** Notification category, used for icons and deep links. */
  type?: string;
  /** Invoice this notification refers to, when applicable. */
  invoice_id?: string | null;
  /** Where clicking the notification should navigate, e.g. /marketplace/123. */
  link?: string;
  read: boolean;
  created_at?: string;
  /** camelCase alias emitted by some components. */
  createdAt?: string;
}

export async function fetchNotifications(): Promise<NotificationItem[]> {
  const res = await fetch(`${API_BASE}/notifications`);
  if (!res.ok) throw new Error("Failed to fetch notifications");
  const payload = await res.json();
  const raw = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.notifications)
      ? payload.notifications
      : [];
  return sortNotificationsByRecency(raw.map(normalizeNotification));
}

export async function fetchUnreadCount(): Promise<{ count: number }> {
  const res = await fetch(`${API_BASE}/notifications/unread-count`);
  if (!res.ok) throw new Error("Failed to fetch unread count");
  return res.json();
}

export async function markNotificationAsRead(
  notificationId: string,
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to mark notification as read");
  return res.json();
}

export async function markAllNotificationsAsRead(): Promise<{
  success: boolean;
}> {
  const res = await fetch(`${API_BASE}/notifications/read-all`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to mark all notifications as read");
  return res.json();
}

/* ─── Settled-invoice pro-rata returns (issue #284) ─────────────────────── */

export interface InvoiceReturnRow {
  investor_wallet: string;
  /** Share of the invoice principal, in percent (0–100). */
  share_percentage: number;
  principal_invested: number;
  return_amount: number;
  net_profit: number;
}

export interface InvoiceReturnsResponse {
  invoice_id: string;
  /** Backend calculation method the frontend must mirror in tooltips. */
  calculation: "floor_division" | string;
  settled_at: string;
  total_return_amount: number;
  returns: InvoiceReturnRow[];
}

export async function fetchInvoiceReturns(
  invoiceId: string,
): Promise<InvoiceReturnsResponse> {
  const res = await fetch(`${API_BASE}/invoices/${invoiceId}/returns`);
  if (!res.ok) throw new Error("Failed to fetch invoice returns");
  return res.json();
}

/* ─── Interim (partial) settlement payments (issue #478) ─────────────────── */

/** One instalment the issuer has paid against a funded invoice. */
export interface InterimPayment {
  id: string;
  amount: number;
  /** ISO 8601 timestamp of the payment. */
  paid_at: string;
  tx_hash?: string | null;
  /** Contract flag on the payment that closes the invoice. */
  is_final?: boolean | null;
}

export interface InterimPaymentsResponse {
  invoice_id: string;
  /** Total amount the issuer is expected to repay. */
  total_due: number;
  /** Oldest first, as returned by the contract. */
  payments: InterimPayment[];
}

/**
 * Read-only `get_interim_payments` contract query: every instalment the issuer
 * has made against a funded invoice. The backend indexes the contract, so the
 * invoice id is the only input.
 */
export async function fetchInterimPayments(
  invoiceId: string,
): Promise<InterimPaymentsResponse> {
  const res = await fetch(
    `${API_BASE}/invoices/${encodeURIComponent(invoiceId)}/interim-payments`,
  );
  if (!res.ok) throw new Error("Failed to fetch interim payments");
  return res.json();
}

export interface AdminInvoiceRow {
  invoiceId: string;
  sellerName: string;
  faceValue: number;
  submittedAt: string;
  documentUrl?: string;
  status: string;
}

export interface AdminInvoicesResponse {
  invoices: AdminInvoiceRow[];
  has_more: boolean;
  next_cursor: string | null;
}

export async function fetchAdminInvoices(
  status = "pending",
  cursor?: string,
  token?: string,
): Promise<AdminInvoicesResponse> {
  const params = new URLSearchParams({ status });
  if (cursor) params.set("cursor", cursor);
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/admin/invoices?${params}`, { headers });
  if (!res.ok) throw new Error("Failed to fetch admin invoices");
  return res.json();
}

export async function approveAdminInvoice(
  invoiceId: string,
  token?: string,
): Promise<{ success: boolean }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/admin/invoices/${invoiceId}/approve`, {
    method: "POST",
    headers,
  });
  if (!res.ok) throw new Error("Failed to approve invoice");
  return res.json();
}

// ??? Settlement multi-sig (issue #118) ??????????????????????????????????????
//
// Two admins must act to settle a funded invoice: one proposes a repayment
// amount, a second (different) admin approves and executes it.

export interface SettlementProposal {
  id: string;
  amount: number;
  proposed_by: string;
  proposed_at: string;
}

export interface SettlementInvoiceRow {
  invoice_id: string;
  title: string;
  face_value: number;
  seller: string;
  proposal: SettlementProposal | null;
}

export interface SettlementsResponse {
  invoices: SettlementInvoiceRow[];
  has_more: boolean;
  next_cursor: string | null;
}

/** Lists funded invoices awaiting settlement, each annotated with its open
 * proposal (if any) so the UI doesn't need one request per invoice. */
export async function fetchSettlements(
  cursor?: string,
  token?: string,
): Promise<SettlementsResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  const res = await fetch(`${API_BASE}/admin/settlements?${params}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch settlements");
  return res.json();
}

export async function proposeSettlement(
  invoiceId: string,
  amount: number,
  token?: string,
): Promise<{ success: boolean }> {
  const res = await fetch(
    `${API_BASE}/admin/invoices/${invoiceId}/settlement/propose`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(token) },
      body: JSON.stringify({ amount }),
    },
  );
  if (!res.ok) throw new Error("Failed to propose settlement");
  return res.json();
}

/** Approves and executes a pending settlement proposal. The backend is the
 * source of truth for the "not your own proposal" rule ? a 403 here (e.g.
 * the proposing admin retrying via another tab) surfaces as this error. */
export async function approveSettlement(
  invoiceId: string,
  token?: string,
): Promise<{ success: boolean }> {
  const res = await fetch(
    `${API_BASE}/admin/invoices/${invoiceId}/settlement/approve`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(token) },
    },
  );
  if (!res.ok) {
    if (res.status === 403) {
      throw new Error("Cannot approve your own settlement proposal");
    }
    throw new Error("Failed to approve settlement");
  }
  return res.json();
}

export async function rejectAdminInvoice(
  invoiceId: string,
  reason: string,
  token?: string,
): Promise<{ success: boolean }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/admin/invoices/${invoiceId}/reject`, {
    method: "POST",
    headers,
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error("Failed to reject invoice");
  return res.json();
}

/* ─── Admin review queue + classification (issues #384, #468) ───────────── */

export interface PendingInvoice {
  id: string;
  title: string;
  seller: string;
  face_value: number;
  submission_date: string;
  status: string;
  document_url?: string;
  /** Sector assigned by an admin; required before approval (#468). */
  category?: string | null;
  /** Risk tier assigned by an admin; required before approval (#468). */
  risk_tier?: string | null;
}

export interface ReviewedInvoice {
  id: string;
  title: string;
  face_value: number;
  reviewed_at: string;
  rejection_reason?: string | null;
  category?: string | null;
  risk_tier?: string | null;
}

export interface ReviewedInvoicesResponse {
  invoices: ReviewedInvoice[];
  has_more: boolean;
  next_cursor: string | null;
}

export interface InvoiceClassification {
  category: string;
  risk_tier: string;
}

/** Invoices waiting for an admin decision. Accepts a bare array or `{ invoices }`. */
export async function fetchPendingInvoices(
  token?: string,
): Promise<PendingInvoice[]> {
  const params = new URLSearchParams({ status: "pending_review" });
  const res = await fetch(`${API_BASE}/admin/invoices?${params}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch pending invoices");
  const payload = await res.json();
  return Array.isArray(payload) ? payload : (payload.invoices ?? []);
}

export async function fetchReviewedInvoices(
  status: "approved" | "rejected",
  cursor?: string,
  token?: string,
): Promise<ReviewedInvoicesResponse> {
  const params = new URLSearchParams({ status });
  if (cursor) params.set("cursor", cursor);
  const res = await fetch(`${API_BASE}/admin/invoices?${params}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`Failed to fetch ${status} invoices`);
  return res.json();
}

export async function approveInvoice(
  invoiceId: string,
  token?: string,
): Promise<{ success: boolean }> {
  return approveAdminInvoice(invoiceId, token);
}

export async function rejectInvoice(
  invoiceId: string,
  reason: string,
  token?: string,
): Promise<{ success: boolean }> {
  return rejectAdminInvoice(invoiceId, reason, token);
}

/** Saves the admin-assigned category and risk tier for a pending invoice (#468). */
export async function assignInvoiceClassification(
  invoiceId: string,
  classification: InvoiceClassification,
  token?: string,
): Promise<InvoiceClassification> {
  const res = await fetch(
    `${API_BASE}/admin/invoices/${encodeURIComponent(invoiceId)}/classification`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders(token) },
      body: JSON.stringify(classification),
    },
  );
  if (!res.ok) {
    if (res.status === 403) throw new Error("Admin access required");
    throw new Error(
      await readErrorMessage(res, "Failed to save category and risk tier"),
    );
  }
  const payload = await res.json().catch(() => ({}));
  return {
    category: payload?.category ?? classification.category,
    risk_tier: payload?.risk_tier ?? classification.risk_tier,
  };
}

export interface PayoutRecord {
  invoiceId: string;
  sellerName: string;
  amountInvested: number;
  amountReceived: number;
  yield: number;
  settledAt: string;
  /** Soroban transaction hash, when the backend provides one. */
  transaction_hash?: string;
  transactionHash?: string;
}

export interface PayoutsResponse {
  payouts: PayoutRecord[];
  has_more: boolean;
  next_cursor: string | null;
}

export async function fetchInvestorPayouts(
  cursor?: string,
): Promise<PayoutsResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);

  const res = await fetch(`${API_BASE}/investor/payouts?${params}`);
  if (!res.ok) throw new Error("Failed to fetch payout history");
  return res.json();
}

export interface PerformanceBond {
  amount: number;
  state: "staked" | "released" | "forfeited";
  maturity_milestone?: string | null;
  release_timestamp?: string | null;
  forfeiture_reason?: string | null;
}

export interface CreatorKeyDetail {
  id: string;
  title: string;
  creator_name: string;
  description?: string;
  price: number;
  holders_count: number;
  whitelist_enabled: boolean;
  holder_balance?: number;
  is_holder?: boolean;
  is_creator?: boolean;
  performance_bond?: PerformanceBond | null;
}

export interface GovernanceOption {
  label: string;
  vote_weight: number;
}

export interface GovernanceProposal {
  id: string;
  title: string;
  status: "active" | "closed";
  expires_at: string;
  snapshot_ledger?: number;
  user_voting_weight?: number;
  user_has_voted?: boolean;
  winning_option_index?: number;
  winning_option?: string;
  options: GovernanceOption[];
}

export interface GovernanceProposalsResponse {
  proposals: GovernanceProposal[];
}

export interface WhitelistStatus {
  whitelist_enabled: boolean;
  is_approved: boolean;
}

export interface KeySupply {
  circulatingSupply: number;
  supplyCap: number | null;
  remainingMintable: number;
}

function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Reads a server-provided error message, falling back to a generic one. */
async function readErrorMessage(
  res: Response,
  fallback: string,
): Promise<string> {
  try {
    const payload = await res.json();
    const message = payload?.message ?? payload?.error;
    return typeof message === "string" && message.length > 0
      ? message
      : fallback;
  } catch {
    return fallback;
  }
}

function normalizeCreatorKeyDetail(raw: any): CreatorKeyDetail {
  return {
    id: raw.id,
    title: raw.title ?? raw.name,
    creator_name: raw.creator_name ?? raw.creatorName ?? raw.creator ?? "",
    description: raw.description,
    price: raw.price ?? 0,
    holders_count: raw.holders_count ?? raw.holdersCount ?? 0,
    whitelist_enabled: raw.whitelist_enabled ?? raw.whitelistEnabled ?? false,
    holder_balance: raw.holder_balance ?? raw.holderBalance,
    is_holder: raw.is_holder ?? raw.isHolder,
    is_creator: raw.is_creator ?? raw.isCreator,
    performance_bond: raw.performance_bond
      ? {
          amount: raw.performance_bond.amount ?? 0,
          state: raw.performance_bond.state ?? "staked",
          maturity_milestone: raw.performance_bond.maturity_milestone ?? null,
          release_timestamp: raw.performance_bond.release_timestamp ?? null,
          forfeiture_reason: raw.performance_bond.forfeiture_reason ?? null,
        }
      : null,
  };
}

function normalizeProposal(raw: any): GovernanceProposal {
  return {
    id: raw.id,
    title: raw.title,
    status: raw.status,
    expires_at: raw.expires_at ?? raw.expiresAt,
    snapshot_ledger: raw.snapshot_ledger ?? raw.snapshotLedger,
    user_voting_weight: raw.user_voting_weight ?? raw.userVotingWeight,
    user_has_voted: raw.user_has_voted ?? raw.userHasVoted,
    winning_option_index: raw.winning_option_index ?? raw.winningOptionIndex,
    winning_option: raw.winning_option ?? raw.winningOption,
    options: (raw.options ?? []).map((option: any) => ({
      label: option.label ?? option.title ?? option.name,
      vote_weight: option.vote_weight ?? option.voteWeight ?? option.votes ?? 0,
    })),
  };
}

function normalizeWhitelistStatus(raw: any): WhitelistStatus {
  return {
    whitelist_enabled: raw.whitelist_enabled ?? raw.whitelistEnabled ?? false,
    is_approved: raw.is_approved ?? raw.isApproved ?? false,
  };
}

function normalizeKeySupply(raw: any): KeySupply {
  const circulatingSupply =
    raw.circulatingSupply ?? raw.circulating_supply ?? raw.circulating ?? 0;
  const supplyCap = raw.supplyCap ?? raw.supply_cap ?? null;
  const remainingMintable =
    raw.remainingMintable ??
    raw.remaining_mintable ??
    (supplyCap === null ? 0 : Math.max(supplyCap - circulatingSupply, 0));

  return {
    circulatingSupply,
    supplyCap,
    remainingMintable,
  };
}

export async function fetchCreatorKeyDetail(
  keyId: string,
  token?: string,
): Promise<CreatorKeyDetail> {
  const res = await fetch(`${API_BASE}/keys/${keyId}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch key detail");
  return normalizeCreatorKeyDetail(await res.json());
}

export async function fetchKeyProposals(
  keyId: string,
  status: "active" | "closed",
  token?: string,
): Promise<GovernanceProposalsResponse> {
  const params = new URLSearchParams({ status });
  const res = await fetch(`${API_BASE}/keys/${keyId}/proposals?${params}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch governance proposals");
  const payload = await res.json();
  const proposals = Array.isArray(payload)
    ? payload
    : (payload.proposals ?? []);
  return { proposals: proposals.map(normalizeProposal) };
}

export async function fetchKeyWhitelistStatus(
  keyId: string,
  walletAddress: string,
  token?: string,
): Promise<WhitelistStatus> {
  const params = new URLSearchParams({ wallet: walletAddress });
  const res = await fetch(`${API_BASE}/keys/${keyId}/whitelist?${params}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch whitelist status");
  return normalizeWhitelistStatus(await res.json());
}

export async function fetchKeySupply(
  keyId: string,
  token?: string,
): Promise<KeySupply> {
  const res = await fetch(`${API_BASE}/keys/${keyId}/supply`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch key supply");
  return normalizeKeySupply(await res.json());
}

export async function buyCreatorKey(
  keyId: string,
  walletAddress: string,
  token?: string,
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/keys/${keyId}/buy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify({ wallet: walletAddress }),
  });
  if (!res.ok) throw new Error("Failed to buy key");
  return res.json();
}

export async function castGovernanceVote(
  keyId: string,
  proposalId: string,
  optionIndex: number,
  walletAddress: string,
  token?: string,
): Promise<{ success: boolean }> {
  const res = await fetch(
    `${API_BASE}/keys/${keyId}/proposals/${proposalId}/votes`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(token),
      },
      body: JSON.stringify({ optionIndex, wallet: walletAddress }),
    },
  );
  if (!res.ok) throw new Error("Failed to cast vote");
  return res.json();
}

export interface BurnKeyResult {
  success: boolean;
  circulatingSupply: number | null;
}

export async function burnCreatorKey(
  keyId: string,
  quantity: number,
  walletAddress: string,
  token?: string,
): Promise<BurnKeyResult> {
  const res = await fetch(`${API_BASE}/keys/${keyId}/burn`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify({ quantity, wallet: walletAddress }),
  });
  if (!res.ok) throw new Error("Failed to burn key");

  const payload = await res.json();
  const circulatingSupply =
    payload?.circulatingSupply ??
    payload?.circulating_supply ??
    payload?.supply?.circulatingSupply ??
    payload?.supply?.circulating_supply ??
    null;

  return {
    success: payload?.success ?? true,
    circulatingSupply:
      typeof circulatingSupply === "number" ? circulatingSupply : null,
  };
}

export interface CreateProposalInput {
  title: string;
  options: string[];
  durationDays: number;
}

export async function createGovernanceProposal(
  keyId: string,
  input: CreateProposalInput,
  walletAddress: string,
  token?: string,
): Promise<GovernanceProposal> {
  const res = await fetch(`${API_BASE}/keys/${keyId}/proposals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify({
      title: input.title,
      options: input.options,
      durationDays: input.durationDays,
      wallet: walletAddress,
    }),
  });
  if (!res.ok) throw new Error("Failed to create proposal");
  return normalizeProposal(await res.json());
}

export async function transferCreatorKey(
  keyId: string,
  recipient: string,
  quantity: number,
  walletAddress: string,
  token?: string,
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/keys/${keyId}/transfer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify({ recipient, quantity, wallet: walletAddress }),
  });
  if (!res.ok) throw new Error("Failed to transfer key");
  return res.json();
}

export interface VestingSchedule {
  keyId: string;
  keyTitle?: string;
  totalKeys: number;
  vestedAmount: number;
  claimedAmount?: number;
  claimableAmount: number;
  startDate?: string | null;
  endDate?: string | null;
  vestingEndsAt?: string | null;
}

function normalizeVestingSchedule(raw: any, keyId: string): VestingSchedule {
  const endDate = raw.endDate ?? raw.end_date ?? null;
  return {
    keyId: raw.keyId ?? raw.key_id ?? keyId,
    keyTitle: raw.keyTitle ?? raw.key_title,
    totalKeys: raw.totalKeys ?? raw.total_keys ?? 0,
    vestedAmount: raw.vestedAmount ?? raw.vested_amount ?? 0,
    claimedAmount: raw.claimedAmount ?? raw.claimed_amount ?? 0,
    claimableAmount: raw.claimableAmount ?? raw.claimable_amount ?? 0,
    startDate: raw.startDate ?? raw.start_date ?? null,
    endDate,
    vestingEndsAt: raw.vestingEndsAt ?? raw.vesting_ends_at ?? endDate,
  };
}

export async function fetchVestingSchedule(
  keyId: string,
  walletAddress: string,
  token?: string,
): Promise<VestingSchedule | null> {
  const res = await fetch(
    `${API_BASE}/vesting/${keyId}/${encodeURIComponent(walletAddress)}`,
    { headers: authHeaders(token) },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch vesting schedule");
  const payload = await res.json();
  if (!payload) return null;
  return normalizeVestingSchedule(payload, keyId);
}

export async function claimVestedKeys(
  keyId: string,
  walletAddress: string,
  token?: string,
): Promise<{ success: boolean }> {
  const res = await fetch(
    `${API_BASE}/vesting/${keyId}/${encodeURIComponent(walletAddress)}/claim`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(token),
      },
      body: JSON.stringify({ wallet: walletAddress }),
    },
  );
  if (!res.ok) throw new Error("Failed to claim vested keys");
  return res.json();
}

export interface AuditLogEntry {
  id: string;
  actorWallet: string;
  actionType: string;
  targetId: string;
  createdAt: string;
  payload?: Record<string, unknown>;
}

export interface AuditLogResponse {
  entries: AuditLogEntry[];
  has_more: boolean;
  next_cursor: string | null;
}

function normalizeAuditLogEntry(raw: any): AuditLogEntry {
  return {
    id: raw.id,
    actorWallet: raw.actorWallet ?? raw.actor_wallet ?? "",
    actionType: raw.actionType ?? raw.action_type ?? "",
    targetId: raw.targetId ?? raw.target_id ?? "",
    createdAt: raw.createdAt ?? raw.created_at ?? "",
    payload: raw.payload ?? raw,
  };
}

export async function fetchAuditLog(
  cursor?: string,
  actionType?: string,
  token?: string,
): Promise<AuditLogResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  if (actionType) params.set("actionType", actionType);

  const res = await fetch(`${API_BASE}/admin/audit-log?${params}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch audit log");
  const payload = await res.json();
  const entries = Array.isArray(payload) ? payload : (payload.entries ?? []);

  return {
    entries: entries.map(normalizeAuditLogEntry),
    has_more: payload.has_more ?? false,
    next_cursor: payload.next_cursor ?? null,
  };
}

export interface ApiConflictError extends Error {
  isConflict: true;
}

export function isApiConflictError(error: unknown): error is ApiConflictError {
  return (
    error instanceof Error &&
    (error as Partial<ApiConflictError>).isConflict === true
  );
}

function conflictError(message: string): ApiConflictError {
  const error = new Error(message) as ApiConflictError;
  error.name = "ApiConflictError";
  error.isConflict = true;
  return error;
}

export async function updateKeySupplyCap(
  keyId: string,
  supplyCap: number,
  token?: string,
): Promise<KeySupply> {
  const res = await fetch(`${API_BASE}/keys/${keyId}/supply`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify({ supplyCap }),
  });

  if (res.status === 409) {
    throw conflictError(
      await readErrorMessage(
        res,
        "Supply cap conflicts with the current circulating supply",
      ),
    );
  }
  if (!res.ok) throw new Error("Failed to update supply cap");

  return normalizeKeySupply(await res.json());
}

export interface MonthlyRevenue {
  month: string;
  royaltyEarned: number;
}

export interface CreatorRevenue {
  totalRoyaltyEarned: number;
  buyRoyaltyEarned: number;
  sellRoyaltyEarned: number;
  tradeCount: number;
  monthlyBreakdown: MonthlyRevenue[];
}

function normalizeMonthlyRevenue(raw: any): MonthlyRevenue {
  return {
    month: raw.month ?? raw.period ?? "",
    royaltyEarned: raw.royaltyEarned ?? raw.royalty_earned ?? 0,
  };
}

function normalizeCreatorRevenue(raw: any): CreatorRevenue {
  const monthly =
    raw.monthlyBreakdown ?? raw.monthly_breakdown ?? raw.monthly ?? [];

  return {
    totalRoyaltyEarned: raw.totalRoyaltyEarned ?? raw.total_royalty_earned ?? 0,
    buyRoyaltyEarned: raw.buyRoyaltyEarned ?? raw.buy_royalty_earned ?? 0,
    sellRoyaltyEarned: raw.sellRoyaltyEarned ?? raw.sell_royalty_earned ?? 0,
    tradeCount: raw.tradeCount ?? raw.trade_count ?? 0,
    monthlyBreakdown: monthly.map(normalizeMonthlyRevenue),
  };
}

export async function fetchCreatorRevenue(
  keyId: string,
  token?: string,
): Promise<CreatorRevenue> {
  const res = await fetch(`${API_BASE}/creator/${keyId}/revenue`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch creator revenue");
  return normalizeCreatorRevenue(await res.json());
}

export type TimelockProposalStatus = "pending" | "executed" | "cancelled";

export interface TimelockProposal {
  id: string;
  changeType: string;
  payload: Record<string, unknown>;
  proposedAt: string;
  executionNotBefore: string;
  status: TimelockProposalStatus;
  executedAt: string | null;
}

export interface TimelockProposalsResponse {
  proposals: TimelockProposal[];
}

function normalizeTimelockProposal(raw: any): TimelockProposal {
  const rawStatus =
    raw.status ?? (raw.executedAt || raw.executed_at ? "executed" : "pending");

  return {
    id: raw.id,
    changeType: raw.changeType ?? raw.change_type ?? "",
    payload: raw.payload ?? {},
    proposedAt: raw.proposedAt ?? raw.proposed_at ?? "",
    executionNotBefore:
      raw.executionNotBefore ?? raw.execution_not_before ?? "",
    status: rawStatus as TimelockProposalStatus,
    executedAt: raw.executedAt ?? raw.executed_at ?? null,
  };
}

export async function fetchTimelockProposals(
  token?: string,
): Promise<TimelockProposalsResponse> {
  const res = await fetch(`${API_BASE}/admin/timelock/proposals`, {
    headers: authHeaders(token),
  });
  if (res.status === 403) throw new ApiForbiddenError("Not a signer");
  if (!res.ok) throw new Error("Failed to fetch timelock proposals");
  const payload = await res.json();
  const proposals = Array.isArray(payload)
    ? payload
    : (payload.proposals ?? []);
  return { proposals: proposals.map(normalizeTimelockProposal) };
}

export async function executeTimelockProposal(
  proposalId: string,
  token?: string,
): Promise<{ success: boolean }> {
  const res = await fetch(
    `${API_BASE}/admin/timelock/proposals/${proposalId}/execute`,
    {
      method: "POST",
      headers: authHeaders(token),
    },
  );
  if (!res.ok) throw new Error("Failed to execute timelock proposal");
  return res.json();
}

export async function cancelTimelockProposal(
  proposalId: string,
  token?: string,
): Promise<{ success: boolean }> {
  const res = await fetch(
    `${API_BASE}/admin/timelock/proposals/${proposalId}/cancel`,
    {
      method: "POST",
      headers: authHeaders(token),
    },
  );
  if (!res.ok) throw new Error("Failed to cancel timelock proposal");
  return res.json();
}

export interface DividendDistributionResult {
  totalDistributed: number;
  perKeyAmount: number;
  holderCount: number;
}

function normalizeDividendResult(
  raw: any,
  fallbackAmount: number,
): DividendDistributionResult {
  return {
    totalDistributed:
      raw.totalDistributed ?? raw.total_distributed ?? fallbackAmount,
    perKeyAmount: raw.perKeyAmount ?? raw.per_key_amount ?? 0,
    holderCount: raw.holderCount ?? raw.holder_count ?? 0,
  };
}

export async function distributeDividend(
  keyId: string,
  amount: number,
  walletAddress: string,
  token?: string,
): Promise<DividendDistributionResult> {
  const res = await fetch(`${API_BASE}/keys/${keyId}/distribute-dividend`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify({ amount, wallet: walletAddress }),
  });
  if (!res.ok) throw new Error("Dividend distribution failed");
  return normalizeDividendResult(await res.json(), amount);
}

export type WalletActivityType =
  | "buy"
  | "sell"
  | "transfer"
  | "burn"
  | "dividend";

export interface WalletActivityEvent {
  id: string;
  type: WalletActivityType;
  keyId?: string;
  keyName: string;
  amount: number;
  createdAt: string;
  counterparty?: string;
  direction?: "in" | "out";
}

export interface WalletActivityResponse {
  events: WalletActivityEvent[];
  has_more: boolean;
  next_cursor: string | null;
}

const WALLET_ACTIVITY_TYPES: WalletActivityType[] = [
  "buy",
  "sell",
  "transfer",
  "burn",
  "dividend",
];

function normalizeActivityType(raw: any): WalletActivityType {
  const value = String(raw ?? "").toLowerCase();
  return WALLET_ACTIVITY_TYPES.includes(value as WalletActivityType)
    ? (value as WalletActivityType)
    : "transfer";
}

function normalizeWalletActivityEvent(raw: any): WalletActivityEvent {
  return {
    id: raw.id ?? raw.event_id ?? raw.eventId ?? "",
    type: normalizeActivityType(raw.type ?? raw.event_type ?? raw.eventType),
    keyId: raw.keyId ?? raw.key_id ?? undefined,
    keyName:
      raw.keyName ?? raw.key_name ?? raw.key_title ?? raw.keyTitle ?? "Key",
    amount: Number(raw.amount ?? raw.quantity ?? 0),
    createdAt: raw.createdAt ?? raw.created_at ?? raw.timestamp ?? "",
    counterparty: raw.counterparty ?? raw.counter_party ?? undefined,
    direction: raw.direction ?? undefined,
  };
}

export async function fetchWalletActivity(
  address: string,
  cursor?: string,
  token?: string,
): Promise<WalletActivityResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);

  const res = await fetch(
    `${API_BASE}/wallets/${encodeURIComponent(address)}/activity?${params}`,
    { headers: authHeaders(token) },
  );
  if (!res.ok) throw new Error("Failed to fetch wallet activity");

  const payload = await res.json();
  const events = Array.isArray(payload)
    ? payload
    : (payload.events ?? payload.activity ?? []);

  return {
    events: events.map(normalizeWalletActivityEvent),
    has_more: payload.has_more ?? payload.hasMore ?? false,
    next_cursor: payload.next_cursor ?? payload.nextCursor ?? null,
  };
}

/* ─── Wallet transaction history (issue #294) ───────────────────────────── */

export const PLATFORM_TRANSACTION_TYPES = [
  "invest",
  "claim",
  "list",
  "cancel",
  "settle",
] as const;

export type PlatformTransactionType =
  (typeof PLATFORM_TRANSACTION_TYPES)[number];

export type PlatformTransactionStatus = "success" | "pending" | "failed";

export interface PlatformTransaction {
  id: string;
  type: PlatformTransactionType;
  amount: number;
  currency: string;
  status: PlatformTransactionStatus;
  createdAt: string;
  /** On-chain hash; absent while a transaction has not been submitted. */
  txHash: string | null;
  invoiceId?: string;
  invoiceTitle?: string;
}

export interface PlatformTransactionsResponse {
  transactions: PlatformTransaction[];
  has_more: boolean;
  next_cursor: string | null;
}

/** Maps the backend's spellings onto the five labels the page shows. */
const TRANSACTION_TYPE_ALIASES: Record<string, PlatformTransactionType> = {
  invest: "invest",
  investment: "invest",
  buy: "invest",
  claim: "claim",
  claim_returns: "claim",
  list: "list",
  listing: "list",
  list_fraction: "list",
  cancel: "cancel",
  cancel_listing: "cancel",
  settle: "settle",
  settlement: "settle",
};

function normalizeTransactionStatus(raw: unknown): PlatformTransactionStatus {
  const value = String(raw ?? "").toLowerCase();
  if (["failed", "error", "reverted"].includes(value)) return "failed";
  if (["pending", "submitted", "processing"].includes(value)) return "pending";
  return "success";
}

function normalizePlatformTransaction(raw: any): PlatformTransaction | null {
  const rawType = String(raw?.type ?? raw?.tx_type ?? raw?.event_type ?? "")
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  const type = TRANSACTION_TYPE_ALIASES[rawType];
  if (!type) return null;
  return {
    id: String(raw.id ?? raw.tx_hash ?? raw.hash ?? ""),
    type,
    amount: Number(raw.amount ?? 0),
    currency: raw.currency ?? raw.asset ?? "XLM",
    status: normalizeTransactionStatus(raw.status),
    createdAt: raw.created_at ?? raw.createdAt ?? raw.timestamp ?? "",
    txHash: raw.tx_hash ?? raw.txHash ?? raw.hash ?? null,
    invoiceId: raw.invoice_id ?? raw.invoiceId ?? undefined,
    invoiceTitle: raw.invoice_title ?? raw.invoiceTitle ?? undefined,
  };
}

/**
 * One page of the connected wallet's platform transactions, newest first.
 * Types outside the five the page understands are dropped.
 */
export async function fetchWalletTransactions(
  address: string,
  options: { cursor?: string; type?: PlatformTransactionType } = {},
  token?: string,
): Promise<PlatformTransactionsResponse> {
  const params = new URLSearchParams();
  if (options.cursor) params.set("cursor", options.cursor);
  if (options.type) params.set("type", options.type);

  const res = await fetch(
    `${API_BASE}/wallets/${encodeURIComponent(address)}/transactions?${params}`,
    { headers: authHeaders(token) },
  );
  if (!res.ok) throw new Error("Failed to fetch transactions");

  const payload = await res.json();
  const rows = Array.isArray(payload)
    ? payload
    : (payload.transactions ?? payload.events ?? []);

  return {
    transactions: rows
      .map(normalizePlatformTransaction)
      .filter((t: PlatformTransaction | null): t is PlatformTransaction => t !== null),
    has_more: payload.has_more ?? payload.hasMore ?? false,
    next_cursor: payload.next_cursor ?? payload.nextCursor ?? null,
  };
}

export interface WhitelistEntry {
  address: string;
  addedAt?: string;
}

export interface WhitelistResponse {
  entries: WhitelistEntry[];
  whitelist_enabled: boolean;
  has_more: boolean;
  next_cursor: string | null;
}

function normalizeWhitelistEntry(raw: any): WhitelistEntry {
  if (typeof raw === "string") return { address: raw };
  return {
    address: raw.address ?? raw.wallet ?? "",
    addedAt: raw.addedAt ?? raw.added_at ?? undefined,
  };
}

export async function fetchKeyWhitelist(
  keyId: string,
  cursor?: string,
  token?: string,
): Promise<WhitelistResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);

  const res = await fetch(`${API_BASE}/creator/${keyId}/whitelist?${params}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch whitelist");

  const payload = await res.json();
  const entries = Array.isArray(payload)
    ? payload
    : (payload.entries ?? payload.addresses ?? []);

  return {
    entries: entries.map(normalizeWhitelistEntry),
    whitelist_enabled:
      payload.whitelist_enabled ?? payload.whitelistEnabled ?? false,
    has_more: payload.has_more ?? payload.hasMore ?? false,
    next_cursor: payload.next_cursor ?? payload.nextCursor ?? null,
  };
}

export async function addWhitelistAddress(
  keyId: string,
  address: string,
  token?: string,
): Promise<WhitelistEntry> {
  const res = await fetch(`${API_BASE}/creator/${keyId}/whitelist/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify({ address }),
  });
  if (!res.ok) throw new Error("Failed to add address to whitelist");
  return normalizeWhitelistEntry(await res.json());
}

export async function removeWhitelistAddress(
  keyId: string,
  address: string,
  token?: string,
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/creator/${keyId}/whitelist/remove`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify({ address }),
  });
  if (!res.ok) throw new Error("Failed to remove address from whitelist");
  return res.json();
}

export async function updateWhitelistMode(
  keyId: string,
  enabled: boolean,
  token?: string,
): Promise<{ whitelist_enabled: boolean }> {
  const res = await fetch(`${API_BASE}/creator/${keyId}/whitelist/mode`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify({ enabled }),
  });
  if (!res.ok) throw new Error("Failed to update whitelist mode");

  const payload = await res.json();
  return {
    whitelist_enabled:
      payload.whitelist_enabled ?? payload.whitelistEnabled ?? enabled,
  };
}

export type KeyTradingStatus = "active" | "pause_pending" | "paused";

export interface PauseProposal {
  keyId: string;
  proposedBy: string;
  proposedAt: string;
}

export interface AdminKeyControl {
  keyId: string;
  keyTitle: string;
  tradingStatus: KeyTradingStatus;
  pendingProposal: PauseProposal | null;
}

export interface AdminKeyControlsResponse {
  keys: AdminKeyControl[];
}

function normalizePauseProposal(raw: any, keyId: string): PauseProposal | null {
  if (!raw) return null;
  return {
    keyId: raw.keyId ?? raw.key_id ?? keyId,
    proposedBy: raw.proposedBy ?? raw.proposed_by ?? raw.proposer ?? "",
    proposedAt: raw.proposedAt ?? raw.proposed_at ?? raw.created_at ?? "",
  };
}

function normalizeAdminKeyControl(raw: any): AdminKeyControl {
  const keyId = raw.keyId ?? raw.key_id ?? raw.id ?? "";
  const pendingProposal = normalizePauseProposal(
    raw.pendingProposal ?? raw.pending_proposal ?? raw.pause_proposal,
    keyId,
  );
  const rawStatus = String(
    raw.tradingStatus ?? raw.trading_status ?? raw.status ?? "",
  ).toLowerCase();

  const tradingStatus: KeyTradingStatus =
    rawStatus === "paused"
      ? "paused"
      : pendingProposal
        ? "pause_pending"
        : "active";

  return {
    keyId,
    keyTitle: raw.keyTitle ?? raw.key_title ?? raw.title ?? raw.name ?? keyId,
    tradingStatus,
    pendingProposal,
  };
}

export async function fetchAdminKeyControls(
  token?: string,
): Promise<AdminKeyControlsResponse> {
  const res = await fetch(`${API_BASE}/admin/keys`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch trading controls");

  const payload = await res.json();
  const keys = Array.isArray(payload) ? payload : (payload.keys ?? []);

  return { keys: keys.map(normalizeAdminKeyControl) };
}

export async function proposeKeyPause(
  keyId: string,
  token?: string,
): Promise<AdminKeyControl> {
  const res = await fetch(`${API_BASE}/admin/keys/${keyId}/pause/propose`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, "Failed to propose pause"));
  }
  return normalizeAdminKeyControl(await res.json());
}

export async function approveKeyPause(
  keyId: string,
  token?: string,
): Promise<AdminKeyControl> {
  const res = await fetch(`${API_BASE}/admin/keys/${keyId}/pause/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, "Failed to approve pause"));
  }
  return normalizeAdminKeyControl(await res.json());
}

/** Subscription status for key-gated content */
export interface SubscriptionStatus {
  isSubscribed: boolean;
  keyBalance: number;
  minimumRequired: number;
  expiryDate?: string | null;
}

/** Fetches subscription status for a wallet against a specific key */
export async function fetchSubscriptionStatus(
  keyId: string,
  walletAddress: string,
  token?: string,
): Promise<SubscriptionStatus> {
  const params = new URLSearchParams({
    wallet: walletAddress,
  });

  const res = await fetch(`${API_BASE}/keys/${keyId}/subscription?${params}`, {
    headers: authHeaders(token),
  });

  if (!res.ok) throw new Error("Failed to fetch subscription status");

  const payload = await res.json();
  return {
    isSubscribed: payload.isSubscribed ?? payload.is_subscribed ?? false,
    keyBalance: payload.keyBalance ?? payload.key_balance ?? 0,
    minimumRequired: payload.minimumRequired ?? payload.minimum_required ?? 1,
    expiryDate: payload.expiryDate ?? payload.expiry_date ?? null,
  };
}

/* ─── Secondary market listings (#463) ──────────────────────────────────── */

export const RESALE_INVOICE_TYPES: readonly string[] = [
  "trade_receivable",
  "supply_chain",
  "promissory_note",
  "equipment_lease",
  "service_contract",
];

export interface ResaleListing {
  id: string;
  invoice_id: string;
  invoice_title: string;
  invoice_type: string;
  quantity: number;
  remaining_quantity: number;
  /** Price per fraction, in XLM. */
  ask_price: number;
  /** Value of one fraction at maturity, in XLM. */
  maturity_value: number;
  maturity_date: string;
  /** Yield the invoice was issued at, shown beside the implied yield for comparison. */
  original_yield_percentage?: number | null;
  seller: string | null;
  status: "active" | "sold" | "cancelled";
  /** When the listing was created; present on newer responses. */
  listed_at?: string;
}

/* ─── Fee schedule (#440) ───────────────────────────────────────────────── */

export type FeeType =
  | "investment_fee"
  | "secondary_market_fee"
  | "settlement_fee"
  | "early_exit_penalty";

export interface FeeScheduleItem {
  fee_type: FeeType;
  label: string;
  rate_percentage: number;
  when_applies: string;
  applies_to: "investor" | "issuer" | "both";
  /** Optional explanatory copy shown on the fee schedule page. */
  description?: string;
}

export interface FeeScheduleResponse {
  fees: FeeScheduleItem[];
  last_updated: string;
}

export interface IndustryBenchmark {
  platform: string;
  investment_fee: number;
  secondary_market_fee: number;
  settlement_fee: number;
  early_exit_penalty: number;
  source: string;
  source_url?: string;
}

/**
 * Competitor fee benchmarks for the fees page comparison table. Left empty
 * until each row is backed by a cited source; never fill it with guessed rates.
 */
export const INDUSTRY_BENCHMARKS: IndustryBenchmark[] = [];

export interface FeeChangeInput {
  fee_type: FeeType;
  rate_percentage: number;
}

export interface FeeChangeLogEntry {
  id: string;
  actor: string;
  fee_type: FeeType;
  old_rate_percentage: number;
  new_rate_percentage: number;
  changed_at: string;
}

/** Raised when the server rejects an admin-only call with 403. */
export class ApiForbiddenError extends Error {
  readonly status: number;

  constructor(message = "Admin access required") {
    super(message);
    this.name = "ApiForbiddenError";
    this.status = 403;
  }
}

export async function fetchFeeSchedule(): Promise<FeeScheduleResponse> {
  const res = await fetch(`${API_BASE}/fees`);
  if (!res.ok) throw new Error("Failed to fetch fee schedule");
  return res.json();
}

export async function updateFeeSchedule(
  changes: FeeChangeInput[],
  token?: string,
): Promise<FeeScheduleResponse> {
  const res = await fetch(`${API_BASE}/admin/fees`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ changes }),
  });
  if (res.status === 403) throw new ApiForbiddenError();
  if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to update fee schedule"));
  return res.json();
}

export async function fetchFeeChangeHistory(token?: string): Promise<FeeChangeLogEntry[]> {
  const res = await fetch(`${API_BASE}/admin/fees/history`, {
    headers: authHeaders(token),
  });
  if (res.status === 403) throw new ApiForbiddenError();
  if (!res.ok) throw new Error("Failed to fetch fee change history");
  return res.json();
}

/**
 * Fetches public fee history showing the last 5 rate changes.
 * This is the public endpoint that doesn't require admin authentication (#466).
 */
export async function fetchPublicFeeHistory(): Promise<FeeChangeLogEntry[]> {
  const res = await fetch(`${API_BASE}/fees/history`);
  if (!res.ok) throw new Error("Failed to fetch fee history");
  return res.json();
}

/* ─── Invoice risk, benchmarks, reports, and contract registry ─────────── */

export type InvoiceRiskType = "funding_risk" | "late_payment" | "default_proximity";
export type InvoiceRiskSeverity = "low" | "medium" | "high";

export interface InvoiceRiskStatus {
  active: boolean;
  risk_type: InvoiceRiskType | null;
  severity: InvoiceRiskSeverity | null;
  recommended_action: string | null;
  resolved_at?: string | null;
}

export async function fetchInvoiceRiskStatus(invoiceId: string): Promise<InvoiceRiskStatus> {
  const res = await fetch(`${API_BASE}/invoices/${encodeURIComponent(invoiceId)}/risk-status`);
  if (!res.ok) throw new Error("Failed to fetch invoice risk status");
  return res.json();
}

export interface InvoiceBenchmark {
  sector: string;
  invoice_yield: number;
  sector_avg_yield: number;
  invoice_avg_settlement_days: number | null;
  sector_avg_settlement_days: number;
  issuer_default_rate: number;
  sector_default_rate: number;
}

export async function fetchInvoiceBenchmark(invoiceId: string): Promise<InvoiceBenchmark> {
  const res = await fetch(`${API_BASE}/invoices/${encodeURIComponent(invoiceId)}/benchmark`);
  if (!res.ok) throw new Error("Failed to fetch invoice benchmark");
  return res.json();
}

/* ─── Invoice NAV / fair value (issue #546) ─────────────────────────────── */

/**
 * The computed fair value of one fraction of an invoice, with the price it is
 * measured against (#546).
 */
export interface InvoiceNav {
  invoice_id: string;
  /** Fair value of one fraction in XLM; null when the API cannot compute one. */
  nav_per_fraction: number | null;
  /** Price of one fraction in XLM; null when the invoice has no market price. */
  current_price: number | null;
  /** When the NAV was computed; null when the API does not report it. */
  computed_at: string | null;
}

/**
 * Fetches the NAV for one invoice (#546).
 *
 * A 404 means the invoice has no NAV to show, which is not an error: it
 * returns `null` so the chip and the invest panel simply stay hidden instead
 * of surfacing a failure for every unpriced invoice.
 */
export async function fetchInvoiceNav(invoiceId: string): Promise<InvoiceNav | null> {
  const res = await fetch(`${API_BASE}/invoices/${encodeURIComponent(invoiceId)}/nav`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch invoice NAV");
  return normalizeInvoiceNav(await res.json(), invoiceId);
}

export const INVOICE_REPORT_REASONS = [
  "misrepresentation",
  "false_documents",
  "non_delivery",
  "other",
] as const;
export type InvoiceReportReason = (typeof INVOICE_REPORT_REASONS)[number];

export interface InvoiceReportStatus {
  active_reports: number;
  reported_by_wallet: boolean;
}

export async function fetchInvoiceReportStatus(
  invoiceId: string,
  wallet?: string | null,
): Promise<InvoiceReportStatus> {
  const params = wallet ? `?wallet=${encodeURIComponent(wallet)}` : "";
  const res = await fetch(
    `${API_BASE}/invoices/${encodeURIComponent(invoiceId)}/report-status${params}`,
  );
  if (!res.ok) throw new Error("Failed to fetch invoice report status");
  return res.json();
}

export async function submitInvoiceReport(
  invoiceId: string,
  input: { reason: InvoiceReportReason; evidence_hash: string; wallet: string },
  token?: string,
): Promise<{ report_id: string; transaction_hash?: string }> {
  const res = await fetch(`${API_BASE}/invoices/${encodeURIComponent(invoiceId)}/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to submit invoice report"));
  return res.json();
}

export interface ContractVersion {
  name: string;
  current_version: string;
  address: string;
  last_upgraded_at: string;
  compatibility_status: "current" | "outdated";
}

export interface ContractUpgrade {
  id: string;
  contract_name: string;
  from_version: string;
  to_version: string;
  upgraded_at: string;
}

export interface ContractRegistryResponse {
  contracts: ContractVersion[];
  recent_upgrades: ContractUpgrade[];
}

export async function fetchContractRegistry(token?: string): Promise<ContractRegistryResponse> {
  const res = await fetch(`${API_BASE}/admin/contracts`, { headers: authHeaders(token) });
  if (res.status === 403) throw new ApiForbiddenError();
  if (!res.ok) throw new Error("Failed to fetch contract registry");
  return res.json();
}

/* ─── Investor account settings (#444) ──────────────────────────────────── */

export interface AccountProfile {
  display_name: string;
  avatar_url: string | null;
  preferred_currency: "XLM" | "USD";
  timezone: string;
}

export interface AccountSession {
  id: string;
  device: string;
  ip_address: string | null;
  last_active_at: string;
  is_current: boolean;
}

export interface TwoFactorSetup {
  secret: string;
  otpauth_url: string;
}

async function readAccountError(res: Response, fallback: string): Promise<never> {
  if (res.status === 403) throw new ApiForbiddenError("Not allowed");
  throw new Error(await readErrorMessage(res, fallback));
}

export async function fetchAccountProfile(token?: string): Promise<AccountProfile> {
  const res = await fetch(`${API_BASE}/users/me`, { headers: authHeaders(token) });
  if (!res.ok) return readAccountError(res, "Failed to load profile");
  return res.json();
}

export async function updateAccountProfile(
  patch: Partial<AccountProfile>,
  token?: string,
): Promise<AccountProfile> {
  const res = await fetch(`${API_BASE}/users/me`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(patch),
  });
  if (!res.ok) return readAccountError(res, "Failed to save profile");
  return res.json();
}

export async function fetchAccountSessions(token?: string): Promise<AccountSession[]> {
  const res = await fetch(`${API_BASE}/users/me/sessions`, { headers: authHeaders(token) });
  if (!res.ok) return readAccountError(res, "Failed to load sessions");
  return res.json();
}

export async function revokeAccountSession(sessionId: string, token?: string): Promise<void> {
  const res = await fetch(`${API_BASE}/users/me/sessions/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) return readAccountError(res, "Failed to revoke session");
}

export async function startTwoFactorSetup(token?: string): Promise<TwoFactorSetup> {
  const res = await fetch(`${API_BASE}/users/me/2fa/setup`, {
    method: "POST",
    headers: authHeaders(token),
  });
  if (!res.ok) return readAccountError(res, "Failed to start two-factor setup");
  return res.json();
}

export async function confirmTwoFactorSetup(code: string, token?: string): Promise<void> {
  const res = await fetch(`${API_BASE}/users/me/2fa/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) return readAccountError(res, "Invalid verification code");
}

// ─── Issuer reputation (#490) ────────────────────────────────────────────

export interface IssuerReputationEvent {
  id: string;
  /** e.g. "settled_on_time", "settled_late", "defaulted". */
  event_type: string;
  date: string;
  score_delta: number;
}

export interface IssuerReputation {
  wallet: string;
  /** Null when the issuer has no settlement history yet. */
  score: number | null;
  history: IssuerReputationEvent[];
}

export async function fetchIssuerReputation(wallet: string): Promise<IssuerReputation> {
  const res = await fetch(`${API_BASE}/issuers/${encodeURIComponent(wallet)}/reputation`);
  if (res.status === 404) return { wallet, score: null, history: [] };
  if (!res.ok) throw new Error("Failed to fetch issuer reputation");
  const raw = await res.json();
  return {
    wallet: raw.wallet ?? wallet,
    score: typeof raw.score === "number" ? raw.score : null,
    history: Array.isArray(raw.history) ? raw.history : [],
  };
}

// ─── Pending timelock changes (#492) ─────────────────────────────────────

export interface PendingTimelockChange {
  id: string;
  parameter: string;
  current_value: string;
  proposed_value: string;
  /** ISO timestamp at which the change can be executed. */
  eta: string;
}

export async function fetchPendingTimelockChanges(): Promise<PendingTimelockChange[]> {
  const res = await fetch(`${API_BASE}/governance/timelock/pending`);
  if (!res.ok) throw new Error("Failed to fetch pending timelock changes");
  const payload = await res.json();
  const changes = Array.isArray(payload) ? payload : (payload?.changes ?? []);
  return changes.map((c: any) => ({
    id: String(c.id),
    parameter: String(c.parameter),
    current_value: String(c.current_value ?? c.currentValue ?? "—"),
    proposed_value: String(c.proposed_value ?? c.proposedValue ?? "—"),
    eta: String(c.eta),
  }));
}

// ─── Transfer restriction pre-flight (#491) ──────────────────────────────

export type TransferRestrictionType =
  | "kyc_required"
  | "jurisdiction_blocked"
  | "accreditation_required";

export interface TransferRestrictionCheck {
  allowed: boolean;
  restriction: TransferRestrictionType | null;
}

export async function fetchTransferRestriction(
  listingId: string,
): Promise<TransferRestrictionCheck> {
  const res = await fetch(
    `${API_BASE}/secondary-market/listings/${encodeURIComponent(listingId)}/transfer-check`,
  );
  if (!res.ok) throw new Error("Failed to check transfer restrictions");
  const raw = await res.json();
  const restriction = (raw.restriction ?? null) as TransferRestrictionType | null;
  return { allowed: raw.allowed !== false && !restriction, restriction };
}
/* ─── Auto-invest (#476) ───────────────────────────────────────────────────
 * The rule lives on-chain: writes hit `set_auto_invest_rule`, the kill switch
 * hits `disable_auto_invest`, and the activity list is the `AutoInvestExecuted`
 * event log indexed by the backend. As with the rest of this module the wallet
 * address is an explicit input.
 */

export interface AutoInvestRulePayload {
  sectors: string[];
  min_yield: number;
  max_invoice_age_days: number;
  max_amount_per_invoice: number;
  is_enabled: boolean;
  updated_at?: string;
}

export interface AutoInvestRuleResponse {
  address: string;
  /** `null` before the investor has ever configured a rule. */
  rule: AutoInvestRulePayload | null;
}

export async function fetchAutoInvestRule(
  address: string,
  token?: string,
): Promise<AutoInvestRuleResponse> {
  const params = new URLSearchParams({ address });
  const res = await fetch(`${API_BASE}/auto-invest/rule?${params.toString()}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch auto-invest rule");
  return res.json();
}

export interface SetAutoInvestRuleResult {
  success: boolean;
  /** Soroban transaction hash for the `set_auto_invest_rule` call. */
  tx_hash?: string;
}

export async function setAutoInvestRule(
  address: string,
  rule: AutoInvestRulePayload,
  token?: string,
): Promise<SetAutoInvestRuleResult> {
  const res = await fetch(`${API_BASE}/auto-invest/rule`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ address, ...rule }),
  });
  if (!res.ok) throw new Error("Failed to save auto-invest rule");
  return res.json();
}

export async function disableAutoInvest(
  address: string,
  token?: string,
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/auto-invest/disable`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ address }),
  });
  if (!res.ok) throw new Error("Failed to disable auto-invest");
  return res.json();
}

/** One `AutoInvestExecuted` event: an invoice the protocol bought on the
 * investor's behalf because it matched their rule. */
export interface AutoInvestExecutedEvent {
  id: string;
  invoice_id: string;
  invoice_title: string;
  amount: number;
  yield_percentage: number;
  sector?: string;
  executed_at: string;
  tx_hash?: string;
}

export async function fetchAutoInvestExecutedEvents(
  address: string,
  limit = 5,
  token?: string,
): Promise<AutoInvestExecutedEvent[]> {
  const params = new URLSearchParams({ address, limit: String(limit) });
  const res = await fetch(
    `${API_BASE}/auto-invest/events?${params.toString()}`,
    { headers: authHeaders(token) },
  );
  if (!res.ok) throw new Error("Failed to fetch auto-invest activity");
  return res.json();
}

/* ─── Invoice auto-rollover (#545) ─────────────────────────────────────────
 * At maturity, a funded position is reinvested into an invoice that matches
 * the rollover criteria. Saving submits `set_rollover_config`, the kill switch
 * submits `disable_rollover`, and the activity list is the `RolloverExecuted`
 * event log indexed by the backend.
 */

export interface RolloverConfigPayload {
  sector: string;
  min_yield: number;
  max_invoice_age: number;
  max_amount: number;
  is_enabled: boolean;
  updated_at?: string;
}

export interface RolloverConfigResponse {
  address: string;
  /** `null` before the investor has ever configured a rollover. */
  config: RolloverConfigPayload | null;
}

export async function fetchRolloverConfig(
  address: string,
  token?: string,
): Promise<RolloverConfigResponse> {
  const params = new URLSearchParams({ address });
  const res = await fetch(`${API_BASE}/rollover/config?${params.toString()}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch rollover config");
  return res.json();
}

export async function setRolloverConfig(
  address: string,
  config: RolloverConfigPayload,
  token?: string,
): Promise<{ success: boolean; tx_hash?: string }> {
  const res = await fetch(`${API_BASE}/rollover/config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ address, method: "set_rollover_config", ...config }),
  });
  if (!res.ok) throw new Error("Failed to save rollover config");
  return res.json();
}

export async function disableRollover(
  address: string,
  token?: string,
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/rollover/disable`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ address, method: "disable_rollover" }),
  });
  if (!res.ok) throw new Error("Failed to disable rollover");
  return res.json();
}

/** One `RolloverExecuted` event: a matured position reinvested automatically. */
export interface RolloverExecutedEvent {
  id: string;
  invoice_id: string;
  invoice_title: string;
  amount: number;
  yield_percentage: number;
  sector?: string;
  executed_at: string;
  tx_hash?: string;
}

export async function fetchRolloverExecutedEvents(
  address: string,
  limit = 5,
  token?: string,
): Promise<RolloverExecutedEvent[]> {
  const params = new URLSearchParams({ address, limit: String(limit) });
  const res = await fetch(`${API_BASE}/rollover/events?${params.toString()}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch rollover activity");
  return res.json();
}

// ---------------------------------------------------------------------------
// Issuer announcements (#502)
// ---------------------------------------------------------------------------

export const ANNOUNCEMENT_CATEGORIES = [
  "update",
  "milestone",
  "warning",
  "event",
] as const;

export type AnnouncementCategory = (typeof ANNOUNCEMENT_CATEGORIES)[number];

export interface InvoiceAnnouncement {
  id: string;
  category: AnnouncementCategory;
  title: string;
  /** ISO timestamp the announcement was posted on-chain. */
  created_at: string;
  /** IPFS hash (CID or ipfs:// URI) of the full announcement body. */
  content_hash: string;
}

export interface InvoiceAnnouncementsResponse {
  announcements: InvoiceAnnouncement[];
  next_cursor?: string | null;
  has_more: boolean;
}

export async function fetchInvoiceAnnouncements(
  invoiceId: string,
  cursor?: string,
  limit = 5,
): Promise<InvoiceAnnouncementsResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  const res = await fetch(
    `${API_BASE}/invoices/${encodeURIComponent(invoiceId)}/announcements?${params}`,
  );
  if (!res.ok) throw new Error("Failed to fetch announcements");
  return res.json();
}

// ---------------------------------------------------------------------------
// Syndicate co-investment (#507)
// ---------------------------------------------------------------------------

export interface SyndicateMember {
  address: string;
  amount: number;
}

export interface Syndicate {
  id: string;
  invoice_id: string;
  lead: string;
  min_co_invest: number;
  target: number;
  committed: number;
  members: SyndicateMember[];
  status: "open" | "executed" | "cancelled";
}

export interface InvoiceSyndicateResponse {
  /** Whether the invoice is large enough to be funded by a syndicate. */
  eligible: boolean;
  syndicate: Syndicate | null;
}

export type SyndicateContractMethod =
  | "create_syndicate"
  | "join_syndicate"
  | "exit_syndicate"
  | "execute_syndicate";

export async function fetchInvoiceSyndicate(
  invoiceId: string,
): Promise<InvoiceSyndicateResponse> {
  const res = await fetch(
    `${API_BASE}/invoices/${encodeURIComponent(invoiceId)}/syndicate`,
  );
  if (!res.ok) throw new Error("Failed to fetch syndicate");
  return res.json();
}

export async function submitSyndicateCall(
  invoiceId: string,
  method: SyndicateContractMethod,
  wallet: string,
  args: { min_co_invest?: number; amount?: number } = {},
): Promise<{ success: boolean; tx_hash?: string }> {
  const res = await fetch(
    `${API_BASE}/invoices/${encodeURIComponent(invoiceId)}/syndicate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method, wallet, ...args }),
    },
  );
  if (!res.ok) throw new Error(`Syndicate call ${method} failed`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Invoice pools (#508)
// ---------------------------------------------------------------------------

export interface PoolInvoice {
  invoice_id: string;
  name: string;
  sector: string;
  /** Share of the pool, in percent. Weights across a pool sum to 100. */
  weight: number;
  /** Current yield of the underlying invoice, in percent. */
  yield_percentage: number;
}

export interface InvoicePool {
  id: string;
  name: string;
  description?: string;
  tvl: number;
  invoices: PoolInvoice[];
}

export interface InvoicePoolsResponse {
  pools: InvoicePool[];
}

export async function fetchInvoicePools(): Promise<InvoicePoolsResponse> {
  const res = await fetch(`${API_BASE}/pools`);
  if (!res.ok) throw new Error("Failed to fetch pools");
  return res.json();
}

export async function fetchInvoicePool(id: string): Promise<InvoicePool> {
  const res = await fetch(`${API_BASE}/pools/${encodeURIComponent(id)}`);
  if (res.status === 404) throw new ApiNotFoundError("Pool not found");
  if (!res.ok) throw new Error("Failed to fetch pool");
  return res.json();
}

export interface InvestPoolResult {
  success: boolean;
  invested_amount: number;
  tx_hash?: string;
}

/** Submits the `invest_pool` contract call: one transaction, all invoices. */
export async function investInPool(
  poolId: string,
  amount: number,
  wallet: string,
): Promise<InvestPoolResult> {
  const res = await fetch(`${API_BASE}/pools/${encodeURIComponent(poolId)}/invest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ method: "invest_pool", amount, wallet }),
  });
  if (!res.ok) throw new Error("Pool investment failed");
  return res.json();
}

/* ─── Pool subscriptions (#544) ────────────────────────────────────────────
 * A subscription invests a fixed amount into a pool on a schedule. Creating
 * one submits `create_subscription`; cancelling submits `cancel_subscription`.
 */

export type PoolSubscriptionInterval = "daily" | "weekly" | "monthly";

export interface PoolSubscription {
  id: string;
  pool_id: string;
  /** Amount invested on each execution, in XLM. */
  amount: number;
  interval: PoolSubscriptionInterval;
  next_execution_at: string;
  /** Sum of every execution so far, in XLM. */
  total_invested: number;
  is_active: boolean;
}

/** Resolves `null` when the wallet has no subscription to this pool (404). */
export async function fetchPoolSubscription(
  poolId: string,
  wallet: string,
): Promise<PoolSubscription | null> {
  const params = new URLSearchParams({ wallet });
  const res = await fetch(
    `${API_BASE}/pools/${encodeURIComponent(poolId)}/subscription?${params.toString()}`,
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch pool subscription");
  return res.json();
}

export interface CreatePoolSubscriptionInput {
  amount: number;
  interval: PoolSubscriptionInterval;
}

export async function createPoolSubscription(
  poolId: string,
  input: CreatePoolSubscriptionInput,
  wallet: string,
): Promise<{ success: boolean; tx_hash?: string }> {
  const res = await fetch(`${API_BASE}/pools/${encodeURIComponent(poolId)}/subscription`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ method: "create_subscription", wallet, ...input }),
  });
  if (!res.ok) throw new Error("Failed to start pool subscription");
  return res.json();
}

export async function cancelPoolSubscription(
  poolId: string,
  wallet: string,
): Promise<{ success: boolean; tx_hash?: string }> {
  const res = await fetch(`${API_BASE}/pools/${encodeURIComponent(poolId)}/subscription`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ method: "cancel_subscription", wallet }),
  });
  if (!res.ok) throw new Error("Failed to cancel pool subscription");
  return res.json();
}

// ---------------------------------------------------------------------------
// Investor loyalty (#509)
// ---------------------------------------------------------------------------

export const LOYALTY_TIERS = ["bronze", "silver", "gold", "platinum"] as const;

export type LoyaltyTierName = (typeof LOYALTY_TIERS)[number];

export interface LoyaltyTierDefinition {
  tier: LoyaltyTierName;
  /** Cumulative investment volume needed to reach this tier. */
  threshold: number;
  /** Fee discount, in percent. */
  fee_discount: number;
  /** Yield boost, in percent. */
  yield_boost: number;
}

export interface InvestorLoyalty {
  tier: LoyaltyTierName;
  cumulative_volume: number;
  tiers: LoyaltyTierDefinition[];
  /** ISO timestamp of the most recent promotion, if any. */
  promoted_at?: string | null;
}

export async function fetchInvestorLoyalty(wallet: string): Promise<InvestorLoyalty> {
  const res = await fetch(
    `${API_BASE}/investors/${encodeURIComponent(wallet)}/loyalty`,
  );
  if (!res.ok) throw new Error("Failed to fetch loyalty");
  return res.json();
}

// ---------------------------------------------------------------------------
// Referral tier (#513)
// ---------------------------------------------------------------------------

export const REFERRAL_TIERS = ["standard", "plus", "elite"] as const;

export type ReferralTierName = (typeof REFERRAL_TIERS)[number];

export interface ReferralTierDefinition {
  tier: ReferralTierName;
  /** Cumulative referred volume needed to reach this tier. */
  threshold: number;
  /** Commission earned on referred volume, in percent. */
  commission_rate: number;
}

export interface ReferralTierStatus {
  tier: ReferralTierName;
  /** Cumulative volume invested by the investors this wallet referred. */
  cumulative_referred_volume: number;
  tiers: ReferralTierDefinition[];
}

export async function fetchReferralTier(wallet: string): Promise<ReferralTierStatus> {
  const res = await fetch(
    `${API_BASE}/referrals/${encodeURIComponent(wallet)}/tier`,
  );
  if (!res.ok) throw new Error("Failed to fetch referral tier");
  return res.json();
}

/* ─── Order book depth (#503) ─── */

export interface OrderBookLevel {
  /** Price per fraction, in XLM. */
  price: number;
  /** Fractions open at this price (not cumulative). */
  quantity: number;
}

export interface InvoiceOrderBook {
  /** Open buy orders. */
  bids: OrderBookLevel[];
  /** Open listings. */
  asks: OrderBookLevel[];
  /** Mid-price from the API; derived from best bid and ask when absent. */
  mid_price?: number | null;
}

export async function fetchInvoiceOrderBook(
  invoiceId: string,
  signal?: AbortSignal,
): Promise<InvoiceOrderBook> {
  const res = await fetch(`${API_BASE}/invoices/${encodeURIComponent(invoiceId)}/orderbook`, {
    signal,
  });
  if (!res.ok) throw new Error("Failed to fetch order book");
  return res.json();
}

/* ─── Restored exports lost in the 88e43dc merge ─────────────────────────── */

export interface AccreditationStatus {
  wallet: string;
  tier: AccreditationTier;
  /** Minimum face value (XLM) that requires accreditation. */
  high_value_threshold: number;
  /** When the current accreditation lapses; absent before the backend reports it (#543). */
  expires_at?: string | null;
}

export type AccreditationTier = "unaccredited" | "accredited" | "qualified";

export type AdminUserRole = "user" | "seller" | "admin";

export interface AdminUserRow {
  wallet: string;
  role: AdminUserRole;
  suspended: boolean;
  joined_at: string;
}

export interface AdminUserRowExtended extends AdminUserRow {
  email: string;
  kyc_status: KycStatus;
  kyc_submitted_at?: string;
  accreditation_tier: "unaccredited" | "accredited" | "qualified";
  flagged: boolean;
  flag_reason?: string;
}

export async function buyFraction(
  input: BuyFractionInput,
  token?: string
): Promise<BuyFractionResult> {
  const res = await fetch(`${API_BASE}/marketplace/listings/${input.listingId}/buy`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ quantity: input.quantity }),
  });
  if (!res.ok) {
    const message = await readConflictErrorMessage(res, "Failed to buy fraction");
    throw new Error(message);
  }
  return res.json();
}

export interface BuyFractionInput {
  listingId: string;
  /** Number of fractions to purchase. */
  quantity: number;
}

export async function cancelLimitOrder(orderId: string): Promise<void> {
  const res = await fetch(
    `${API_BASE}/marketplace/limit-orders/${encodeURIComponent(orderId)}/cancel`,
    { method: "POST" }
  );
  if (!res.ok) {
    const msg = await readErrorMessage(res, "Failed to cancel limit order");
    throw new Error(msg);
  }
}

export async function claimAllDividends(): Promise<InvestorDividendsResponse> {
  const res = await fetch(`${API_BASE}/investor/claim-dividends`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to claim dividends");
  const payload = await res.json();
  // Backend may return the refreshed summary or just success.
  if (payload && (payload.claimable || payload.claimsByCycle || payload.total_earned !== undefined)) {
    return normalizeInvestorDividends(payload);
  }
  return fetchInvestorDividends();
}

export async function claimAllYieldTranches(
  walletAddress: string
): Promise<ClaimTrancheResult> {
  const res = await fetch(`${API_BASE}/investor/yield-vesting/claim-all`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet_address: walletAddress }),
  });
  if (!res.ok) {
    const msg = await readErrorMessage(res, "Failed to claim all tranches");
    throw new Error(msg);
  }
  return res.json();
}

export async function claimDividendCycle(
  cycleId: string
): Promise<{ success: boolean; transaction_hash?: string }> {
  const res = await fetch(
    `${API_BASE}/investor/dividends/${encodeURIComponent(cycleId)}/claim`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }
  );
  if (!res.ok) throw new Error("Failed to claim dividend");
  return res.json();
}

export async function claimYieldTranche(trancheId: string): Promise<ClaimTrancheResult> {
  const res = await fetch(
    `${API_BASE}/investor/yield-vesting/${encodeURIComponent(trancheId)}/claim`,
    { method: "POST" }
  );
  if (!res.ok) {
    const msg = await readErrorMessage(res, "Failed to claim tranche");
    throw new Error(msg);
  }
  return res.json();
}

export interface DefaultResolution {
  invoice_id: string;
  invoice_title: string;
  declaration_date: string;
  collateral_forfeited: number;
  total_recovery_distributed: number;
  recovery_distribution_pending: boolean;
  holders: DefaultResolutionHolder[];
  dispute_form_url: string;
}

export async function deleteDraftInvoice(
  id: string,
  token?: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/invoices/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to delete draft invoice");
  return res.json();
}

export interface EmailNotificationPreference {
  event_type: EmailNotificationType;
  email: boolean;
}

export type EmailNotificationType =
  | "settlement"
  | "kyc_status"
  | "watchlist_invoice_match"
  | "secondary_market_sale"
  | "invoice_decision";

export interface FeeTierInfo {
  fee_percentage: number;
  tier_label: string;
  volume_24h: number;
  tiers: FeeTierEntry[];
  is_lowest_tier: boolean;
}

export async function fetchAccreditationStatus(
  walletAddress: string,
  token?: string
): Promise<AccreditationStatus> {
  const res = await fetch(
    `${API_BASE}/investors/${encodeURIComponent(walletAddress)}/accreditation`,
    { headers: authHeaders(token) }
  );
  if (!res.ok) throw new Error("Failed to fetch accreditation status");
  return normalizeAccreditationStatus(await res.json(), walletAddress);
}

export async function fetchActiveLimitOrders(
  walletAddress: string
): Promise<LimitOrder[]> {
  const url = new URL(
    `${API_BASE}/marketplace/limit-orders`,
    typeof window !== "undefined" ? window.location.href : "http://localhost"
  );
  url.searchParams.set("address", walletAddress);
  url.searchParams.set("status", "open");
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch limit orders");
  const json = await res.json();
  return Array.isArray(json) ? json : (json.orders ?? []);
}

export async function fetchAdminUsers(
  search = "",
  cursor?: string,
  token?: string
): Promise<AdminUsersResponse> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (cursor) params.set("cursor", cursor);

  const res = await fetch(`${API_BASE}/admin/users?${params}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, "Failed to fetch users"));
  }
  return res.json();
}

export async function fetchCreatorProfile(
  wallet: string,
  cursor?: string
): Promise<CreatorProfileResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);

  const res = await fetch(`${API_BASE}/creators/${wallet}?${params}`);
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, "Failed to fetch creator profile"));
  }
  return normalizeCreatorProfile(await res.json());
}

export async function fetchDefaultResolution(
  invoiceId: string
): Promise<DefaultResolution> {
  const res = await fetch(
    `${API_BASE}/invoices/${encodeURIComponent(invoiceId)}/default-resolution`
  );
  if (!res.ok) throw new Error("Failed to fetch default resolution");
  return res.json();
}

export async function fetchEmailNotificationPreferences(): Promise<EmailNotificationPreference[]> {
  const res = await fetch(`${API_BASE}/notifications/preferences/email`);
  if (!res.ok) throw new Error("Failed to fetch notification preferences");
  return res.json();
}

export async function fetchFeeTier(): Promise<FeeTierInfo> {
  const res = await fetch(`${API_BASE}/protocol/fee-tier`);
  if (!res.ok) throw new Error("Failed to fetch fee tier");
  return normalizeFeeTierInfo(await res.json());
}

export async function fetchInvestorDividends(): Promise<InvestorDividendsResponse> {
  const res = await fetch(`${API_BASE}/investor/dividends`);
  if (!res.ok) throw new Error("Failed to fetch dividends");
  return normalizeInvestorDividends(await res.json());
}

export async function fetchInvestorReputation(
  wallet: string
): Promise<InvestorReputation> {
  const res = await fetch(
    `${API_BASE}/investors/${encodeURIComponent(wallet)}/reputation`
  );
  if (!res.ok) throw new Error("Failed to fetch investor reputation");
  return normalizeInvestorReputation(await res.json(), wallet);
}

export async function fetchInvoiceDemandMetrics(
  invoiceId: string
): Promise<InvoiceDemandMetrics> {
  const res = await fetch(
    `${API_BASE}/invoices/${encodeURIComponent(invoiceId)}/demand-metrics`
  );
  if (!res.ok) throw new Error("Failed to fetch demand metrics");
  return normalizeInvoiceDemandMetrics(await res.json(), invoiceId);
}

export async function fetchInvoiceFundingProgress(
  invoiceId: string
): Promise<InvoiceFundingProgress> {
  const res = await fetch(
    `${API_BASE}/invoices/${encodeURIComponent(invoiceId)}/funding-progress`
  );
  if (!res.ok) throw new Error("Failed to fetch funding progress");
  return normalizeInvoiceFundingProgress(await res.json(), invoiceId);
}

export async function fetchInvoicePriceHistory(
  invoiceId: string,
  range: PriceHistoryRangeParam = "all",
  signal?: AbortSignal
): Promise<InvoicePriceHistory> {
  const res = await fetch(
    `${API_BASE}/marketplace/invoices/${invoiceId}/price-history?range=${range}`,
    { signal }
  );
  if (!res.ok) throw new Error("Failed to fetch invoice price history");

  const payload = await res.json();
  return normalizeInvoicePriceHistory(payload, invoiceId);
}

export async function fetchInvoiceProtection(
  invoiceId: string
): Promise<InvoiceProtectionInfo> {
  const res = await fetch(
    `${API_BASE}/invoices/${encodeURIComponent(invoiceId)}/protection`
  );
  if (!res.ok) throw new Error("Failed to fetch sell tax info");
  return normalizeProtectionInfo(await res.json(), invoiceId);
}

export async function fetchInvoiceRating(
  invoiceId: string,
  walletAddress?: string | null
): Promise<InvoiceRatingSummary> {
  const query = walletAddress ? `?wallet=${encodeURIComponent(walletAddress)}` : "";
  const res = await fetch(
    `${API_BASE}/invoices/${encodeURIComponent(invoiceId)}/rating${query}`
  );
  if (!res.ok) throw new Error("Failed to fetch invoice rating");
  return normalizeInvoiceRating(await res.json(), invoiceId);
}

export async function fetchIssuerEarnings(
  cursor?: string,
  token?: string
): Promise<IssuerEarningsResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  const res = await fetch(`${API_BASE}/issuer/earnings?${params}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch issuer earnings");
  const payload = await res.json();
  return {
    summary: normalizeIssuerEarningsSummary(payload.summary ?? payload),
    invoices: (payload.invoices ?? []).map(normalizeIssuerInvoiceEarning),
    has_more: payload.has_more ?? false,
    next_cursor: payload.next_cursor ?? null,
  };
}

export async function fetchKycHistory(
  wallet: string,
  cursor?: string,
  token?: string
): Promise<KycHistoryResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);

  const res = await fetch(`${API_BASE}/admin/users/${wallet}/kyc/history?${params}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, "Failed to fetch KYC history"));
  }
  return res.json();
}

export async function fetchLeaderboard(): Promise<LeaderboardInvestor[]> {
  const res = await fetch(`${API_BASE}/leaderboard`);
  if (!res.ok) throw new Error("Failed to fetch leaderboard");
  const payload = await res.json();
  const list = Array.isArray(payload) ? payload : payload.investors ?? [];
  return list.map(normalizeLeaderboardInvestor);
}

export async function fetchNotificationPreferences(): Promise<NotificationPreference[]> {
  const res = await fetch(`${API_BASE}/notifications/preferences`);
  if (!res.ok) throw new Error("Failed to fetch notification preferences");
  return res.json();
}

export async function fetchPlatformActivity(
  limit = 20
): Promise<PlatformActivityEvent[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  const res = await fetch(`${API_BASE}/activity?${params}`);
  if (!res.ok) throw new Error("Failed to fetch platform activity");
  const payload = await res.json();
  const events = Array.isArray(payload)
    ? payload
    : payload.events ?? payload.activity ?? [];
  return events
    .map(normalizePlatformActivityEvent)
    .slice(0, limit);
}

export async function fetchResaleListings(
  filters: ResaleListingFilters = {},
  signal?: AbortSignal
): Promise<ResaleListingsResponse> {
  const params = buildResaleListingParams(filters);
  const query = params.toString();
  const res = await fetch(
    `${API_BASE}/marketplace/listings${query ? `?${query}` : ""}`,
    { signal }
  );
  if (!res.ok) throw new Error("Failed to fetch resale listings");

  const payload = await res.json();
  const rawList: any[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.listings)
      ? payload.listings
      : [];

  return {
    listings: rawList.map(normalizeResaleListing),
    has_more: Boolean(payload?.has_more ?? false),
    next_cursor: payload?.next_cursor ?? null,
  };
}

export async function fetchYieldVesting(
  walletAddress: string
): Promise<InvoiceYieldVesting[]> {
  const res = await fetch(
    `${API_BASE}/investor/yield-vesting?address=${encodeURIComponent(walletAddress)}`
  );
  if (!res.ok) throw new Error("Failed to fetch yield vesting");
  const json = await res.json();
  return Array.isArray(json) ? json : (json.schedules ?? []);
}

export async function flagUser(
  wallet: string,
  reason: string,
  token?: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/admin/users/${wallet}/flag`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, "Failed to flag user"));
  }
  return res.json();
}

export function getReputationTier(score: number): ReputationTier {
  if (score >= 800) return "Verified";
  if (score >= 500) return "Trusted";
  return "New";
}

export interface InvestorReputation {
  wallet: string;
  score: number;
  tier: ReputationTier;
  investments_completed: number;
  governance_votes: number;
  platform_tenure_days: number;
  history: ReputationScoreHistoryPoint[];
}

export interface InvoiceDemandMetrics {
  invoice_id: string;
  /** Unique investors backing the invoice, as reported by the API. */
  investor_count: number;
  /** Face value committed in the last 24 hours. */
  raised_last_24h: number;
  /** Total raised, so the 24h rate can be expressed as a percentage. */
  raised: number;
  target: number;
  /** When the invoice was funded; `null` while it is still open. */
  funded_at: string | null;
}

export interface InvoiceFundingProgress {
  invoice_id: string;
  raised: number;
  target: number;
  investor_count: number;
  is_fully_funded: boolean;
}

export interface InvoicePriceHistory {
  invoice_id: string;
  /** Ask price of the invoice's current active listing, or null if it isn't currently listed. */
  current_ask_price: number | null;
  history: InvoicePriceHistoryPoint[];
}

export interface InvoicePriceHistoryPoint {
  date: string;
  price: number;
  quantity: number;
}

export interface InvoiceProtectionInfo {
  invoice_id: string;
  sell_tax_percentage: number;
  buyback_pool_balance: number;
}

export interface InvoiceRatingSummary {
  invoice_id: string;
  average_rating: number;
  rating_count: number;
  user_rating?: number | null;
  /** Count of ratings per star (1–5). Absent on older backend responses. */
  distribution?: Record<1 | 2 | 3 | 4 | 5, number>;
}

export interface InvoiceYieldVesting {
  invoice_id: string;
  invoice_title: string;
  total_yield: number;
  claimed_yield: number;
  tranches: YieldTranche[];
}

export function isAccreditedForInvoice(
  tier: AccreditationTier,
  faceValue: number,
  threshold: number
): boolean {
  if (faceValue < threshold) return true;
  return tier === "accredited" || tier === "qualified";
}

export interface IssuerInvoiceEarning {
  invoice_id: string;
  invoice_title: string;
  face_value: number;
  funded_date: string;
  gross_proceeds: number;
  platform_fee: number;
  net_payout: number;
  payout_status: IssuerPayoutStatus;
  transaction_hash?: string;
}

export interface LeaderboardInvestor {
  address: string;
  total_committed: number;
  invoice_count: number;
}

export interface LimitOrder {
  id: string;
  invoice_id: string;
  investor_address: string;
  fraction_amount: number;
  max_price_per_fraction: number;
  total_escrowed: number;
  status: "open" | "filled" | "cancelled" | "expired";
  created_at: string;
}

export function normalizeAdminUsersExtendedResponse(
  raw: any
): AdminUsersExtendedResponse {
  const list = Array.isArray(raw) ? raw : (raw?.users ?? []);
  return {
    users: (Array.isArray(list) ? list : []).map(normalizeAdminUserRowExtended),
    has_more: Boolean(raw?.has_more ?? false),
    next_cursor: raw?.next_cursor ?? null,
  };
}

export function normalizeNotification(raw: any): NotificationItem {
  return {
    ...raw,
    id: raw.id,
    title: raw.title ?? undefined,
    message: raw.message ?? undefined,
    body: raw.body ?? raw.description ?? undefined,
    link: raw.link ?? raw.url ?? undefined,
    type: raw.type ?? raw.event_type ?? raw.eventType ?? undefined,
    invoice_id: raw.invoice_id ?? raw.invoiceId ?? undefined,
    read: Boolean(raw.read ?? raw.is_read ?? false),
    created_at: raw.created_at ?? raw.createdAt ?? undefined,
  };
}

export interface NotificationPreference {
  event_type: NotificationEventType;
  email: boolean;
  in_app: boolean;
}

export async function placeLimitOrder(
  input: PlaceLimitOrderInput
): Promise<PlaceLimitOrderResult> {
  const res = await fetch(`${API_BASE}/marketplace/limit-orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      invoice_id: input.invoice_id,
      fraction_amount: input.fraction_amount,
      max_price_per_fraction: input.max_price_per_fraction,
    }),
  });
  if (!res.ok) {
    const msg = await readErrorMessage(res, "Failed to place limit order");
    throw new Error(msg);
  }
  return res.json();
}

export interface PlaceLimitOrderInput {
  invoice_id: string;
  fraction_amount: number;
  max_price_per_fraction: number;
}

export interface PlatformActivityEvent {
  id: string;
  type: PlatformActivityEventType;
  invoice_id: string;
  title: string;
  amount?: number;
  created_at: string;
}

export type PlatformActivityEventType =
  | "new_investment"
  | "invoice_funded"
  | "invoice_settled"
  | "new_listing";

export type PriceHistoryRangeParam = "7d" | "30d" | "all";

export interface ResaleListingFilters {
  invoiceId?: string;
  invoiceType?: string;
  minYield?: number;
  maxYield?: number;
  minPrice?: number;
  maxPrice?: number;
  /** Only listings maturing within this many days. */
  maxDaysToMaturity?: number;
}

export async function saveEmailNotificationPreferences(
  preferences: EmailNotificationPreference[]
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/notifications/preferences/email`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preferences }),
  });
  if (!res.ok) throw new Error("Failed to save notification preferences");
  return res.json();
}

export function sortNotificationsByRecency(
  notifications: NotificationItem[]
): NotificationItem[] {
  return [...notifications].sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    // Items with no timestamp sort last rather than jumping to the top.
    if (a.created_at && !b.created_at) return -1;
    if (!a.created_at && b.created_at) return 1;
    return bTime - aTime;
  });
}

export async function submitDraftInvoice(
  id: string,
  token?: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/invoices/${id}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
  });
  if (!res.ok) throw new Error("Failed to submit invoice for review");
  return res.json();
}

export async function submitInvoiceRating(
  invoiceId: string,
  rating: number,
  walletAddress?: string,
  token?: string
): Promise<InvoiceRatingSummary> {
  const res = await fetch(
    `${API_BASE}/invoices/${encodeURIComponent(invoiceId)}/rating`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(token) },
      body: JSON.stringify({ rating, wallet: walletAddress }),
    }
  );
  if (!res.ok) throw new Error("Failed to submit rating");
  return normalizeInvoiceRating(await res.json(), invoiceId);
}

export async function suspendAdminUser(
  wallet: string,
  token?: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/admin/users/${wallet}/suspend`, {
    method: "POST",
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, "Failed to suspend user"));
  }
  return res.json();
}

export async function transferInvoiceFractions(
  invoiceId: string,
  recipient: string,
  quantity: number,
  walletAddress: string,
  token?: string
): Promise<{ success: boolean; transaction_hash: string }> {
  const res = await fetch(
    `${API_BASE}/invoices/${encodeURIComponent(invoiceId)}/transfer-fractions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(token),
      },
      body: JSON.stringify({
        recipient,
        quantity,
        wallet: walletAddress,
      }),
    }
  );
  if (!res.ok) throw new Error("Failed to transfer invoice fractions");
  return res.json();
}

export async function transferInvoicePosition(
  invoiceId: string,
  buyer: string,
  salePriceXlm: number,
  walletAddress: string,
  token?: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/invoices/${invoiceId}/transfer-position`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify({
      buyer,
      sale_price: salePriceXlm,
      wallet: walletAddress,
    }),
  });
  if (!res.ok) throw new Error("Failed to transfer position");
  return res.json();
}

export async function unflagUser(
  wallet: string,
  token?: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/admin/users/${wallet}/unflag`, {
    method: "POST",
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, "Failed to unflag user"));
  }
  return res.json();
}

export async function unsuspendAdminUser(
  wallet: string,
  token?: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/admin/users/${wallet}/unsuspend`, {
    method: "POST",
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, "Failed to unsuspend user"));
  }
  return res.json();
}

export async function updateAdminUserRole(
  wallet: string,
  role: AdminUserRole,
  token?: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/admin/users/${wallet}/role`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, "Failed to update role"));
  }
  return res.json();
}

export async function updateUserKycStatus(
  wallet: string,
  status: KycStatus,
  reason?: string,
  token?: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/admin/users/${wallet}/kyc`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ status, reason }),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, "Failed to update KYC status"));
  }
  return res.json();
}

export async function uploadDocumentToIpfs(file: File, token?: string): Promise<IpfsUploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/ipfs/upload`, {
    method: "POST",
    headers: authHeaders(token),
    body: formData,
  });
  if (!res.ok) throw new Error("Document upload failed");
  return res.json();
}

export async function withdrawIssuerEarnings(
  invoiceId: string,
  token?: string
): Promise<{ success: boolean; transaction_hash?: string }> {
  const res = await fetch(`${API_BASE}/issuer/earnings/${invoiceId}/withdraw`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
  });
  if (!res.ok) throw new Error("Failed to submit withdrawal");
  return res.json();
}

export interface YieldTranche {
  id: string;
  invoice_id: string;
  invoice_title: string;
  tranche_index: number;
  total_tranches: number;
  total_yield: number;
  amount: number;
  claimed: boolean;
  release_timestamp: string;
}

export interface ProtocolStatus {
  min_investment: number;
  [key: string]: unknown;
}

export interface BuyFractionResult {
  success: boolean;
  transaction_hash?: string;
  /** Remaining quantity reported by the contract after the transfer. */
  remaining_quantity?: number;
}

export interface InvestorDividendsResponse {
  total_earned: number;
  total_pending: number;
  claimable: DividendCycle[];
  history: DividendClaimRecord[];
}

export interface ClaimTrancheResult {
  success: boolean;
  transaction_hash?: string;
  claimed_amount: number;
}

export interface DefaultResolutionHolder {
  address: string;
  investment_amount: number;
  recovery_amount: number;
  recovery_paid: boolean;
}

export interface FeeTierEntry {
  tier: string;
  min_volume: number;
  fee_percentage: number;
}

export interface AdminUsersResponse {
  users: AdminUserRow[];
  has_more: boolean;
  next_cursor: string | null;
}

export interface CreatorProfileResponse {
  wallet: string;
  display_name?: string | null;
  displayName?: string | null;
  joined_at: string;
  joinedAt?: string;
  kyc_verified: boolean;
  kycVerified?: boolean;
  stats: CreatorProfileStats;
  invoices: CreatorProfileInvoice[];
  has_more: boolean;
  next_cursor: string | null;
}

export interface IssuerEarningsResponse {
  summary: IssuerEarningsSummary;
  invoices: IssuerInvoiceEarning[];
  has_more: boolean;
  next_cursor: string | null;
}

export interface KycHistoryResponse {
  history: KycHistoryEntry[];
  has_more: boolean;
  next_cursor: string | null;
}

export interface ResaleListingsResponse {
  listings: ResaleListing[];
  has_more: boolean;
  next_cursor: string | null;
}

export type ReputationTier = "Verified" | "Trusted" | "New";

export interface ReputationScoreHistoryPoint {
  date: string;
  score: number;
}

export type IssuerPayoutStatus = "pending" | "paid" | "processing";

export interface AdminUsersExtendedResponse {
  users: AdminUserRowExtended[];
  has_more: boolean;
  next_cursor: string | null;
}

export function normalizeAdminUserRowExtended(raw: any): AdminUserRowExtended {
  const accreditation = String(
    raw.accreditation_tier ?? raw.accreditationTier ?? "unaccredited"
  ).toLowerCase();
  const flagged = Boolean(raw.flagged ?? raw.is_flagged ?? raw.isFlagged ?? false);

  return {
    wallet: String(raw.wallet ?? raw.address ?? ""),
    role: (raw.role ?? "user") as AdminUserRole,
    suspended: Boolean(raw.suspended ?? false),
    joined_at: String(raw.joined_at ?? raw.joinedAt ?? raw.created_at ?? ""),
    email: String(raw.email ?? ""),
    kyc_status: flagged ? "flagged" : normalizeKycStatus(raw.kyc_status ?? raw.kycStatus),
    kyc_submitted_at:
      raw.kyc_submitted_at ?? raw.kycSubmittedAt ?? raw.submitted_at ?? undefined,
    accreditation_tier: (ADMIN_USER_ACCREDITATION_TIERS as string[]).includes(accreditation)
      ? (accreditation as AdminUserRowExtended["accreditation_tier"])
      : "unaccredited",
    flagged,
    flag_reason: raw.flag_reason ?? raw.flagReason ?? undefined,
  };
}

export interface PlaceLimitOrderResult {
  success: boolean;
  order: LimitOrder;
  transaction_hash?: string;
}

export interface IpfsUploadResult {
  cid: string;
  url: string;
}

export interface DividendCycle {
  cycle: string;
  cycle_id?: string;
  amount: number;
  distribution_date: string;
  claimable: boolean;
  claimed?: boolean;
  transaction_hash?: string | null;
}

export interface DividendClaimRecord {
  cycle: string;
  amount: number;
  claimed_at: string;
  transaction_hash: string;
}

export interface CreatorProfileStats {
  total_invoices: number;
  total_funded: number;
  settlement_success_rate: number;
}

export interface CreatorProfileInvoice {
  id: string;
  title: string;
  amount: number;
  funded_amount: number;
  status: Invoice["status"];
  created_at: string;
}

export interface IssuerEarningsSummary {
  gross_proceeds: number;
  platform_fee: number;
  net_payout: number;
}

export interface KycHistoryEntry {
  id: string;
  wallet: string;
  status: KycStatus;
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  rejection_reason?: string;
  documents: string[];
}

/* ─── Restored internal helpers ─── */

async function readConflictErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const payload = await res.json();
    const message = payload?.message ?? payload?.error;
    return typeof message === "string" && message.length > 0 ? message : fallback;
  } catch {
    return fallback;
  }
}

function normalizeInvestorDividends(raw: any): InvestorDividendsResponse {
  const claimableRaw: any[] = Array.isArray(raw.claimable)
    ? raw.claimable
    : Array.isArray(raw.claimsByCycle)
      ? raw.claimsByCycle
      : Array.isArray(raw.cycles)
        ? raw.cycles
        : [];
  const historyRaw: any[] = Array.isArray(raw.history)
    ? raw.history
    : Array.isArray(raw.claimed)
      ? raw.claimed
      : [];
  const claimable = claimableRaw.map(normalizeDividendCycle);
  const history = historyRaw.map(normalizeDividendClaimRecord);
  const total_pending = Number(
    raw.total_pending ?? raw.totalPending ?? raw.pendingClaims ?? 0
  );
  const total_earned = Number(
    raw.total_earned ?? raw.totalEarned ?? raw.totalEarnedXlm ?? 0
  );
  // Aggregate fallback when backend only sends cycles.
  const pendingFallback = claimable
    .filter((c) => c.claimable && !c.claimed)
    .reduce((sum, c) => sum + c.amount, 0);
  const earnedFallback =
    pendingFallback + history.reduce((sum, h) => sum + h.amount, 0);
  return {
    total_earned: total_earned || earnedFallback,
    total_pending: raw.total_pending !== undefined ? total_pending : pendingFallback,
    claimable,
    history,
  };
}

function normalizeAccreditationStatus(raw: any, wallet: string): AccreditationStatus {
  return {
    wallet: raw.wallet ?? raw.address ?? wallet,
    tier: normalizeAccreditationTier(raw.tier ?? raw.accreditation_tier ?? raw.accreditationTier),
    high_value_threshold: Number(
      raw.high_value_threshold ?? raw.highValueThreshold ?? raw.threshold ?? 100_000
    ),
    expires_at: raw.expires_at ?? raw.expiresAt ?? null,
  };
}

function normalizeCreatorProfile(raw: any): CreatorProfileResponse {
  return {
    wallet: raw.wallet ?? raw.address ?? "",
    display_name: raw.display_name ?? raw.displayName ?? null,
    joined_at: raw.joined_at ?? raw.joinedAt ?? raw.created_at ?? "",
    kyc_verified: Boolean(raw.kyc_verified ?? raw.kycVerified),
    stats: {
      total_invoices: raw.stats?.total_invoices ?? raw.total_invoices ?? 0,
      total_funded: raw.stats?.total_funded ?? raw.total_funded ?? 0,
      settlement_success_rate:
        raw.stats?.settlement_success_rate ?? raw.settlement_success_rate ?? 0,
    },
    invoices: raw.invoices ?? [],
    has_more: Boolean(raw.has_more),
    next_cursor: raw.next_cursor ?? null,
  };
}

function normalizeFeeTierInfo(raw: any): FeeTierInfo {
  const tiers = Array.isArray(raw.tiers)
    ? raw.tiers.map(normalizeFeeTierEntry)
    : FEE_TIERS;
  const fee_percentage = Number(
    raw.fee_percentage ?? raw.feePercentage ?? raw.fee ?? 0
  );
  const tier_label = String(
    raw.tier_label ?? raw.tierLabel ?? raw.tier ?? ""
  );
  const volume_24h = Number(
    raw.volume_24h ?? raw.volume24h ?? raw.volume ?? 0
  );
  const lowestFee = Math.min(...tiers.map((t: FeeTierEntry) => t.fee_percentage));
  return {
    fee_percentage,
    tier_label,
    volume_24h,
    tiers,
    is_lowest_tier:
      typeof raw.is_lowest_tier === "boolean"
        ? raw.is_lowest_tier
        : fee_percentage <= lowestFee,
  };
}

function normalizeInvestorReputation(raw: any, wallet: string): InvestorReputation {
  const score = Number(
    raw.score ?? raw.reputation_score ?? raw.reputationScore ?? 0
  );
  const breakdown = raw.breakdown ?? raw;
  return {
    wallet: raw.wallet ?? raw.address ?? wallet,
    score,
    tier: (raw.tier as ReputationTier) ?? getReputationTier(score),
    investments_completed: Number(
      raw.investments_completed ??
        breakdown.investments_completed ??
        breakdown.investmentsCompleted ??
        raw.investmentsCompleted ??
        0
    ),
    governance_votes: Number(
      raw.governance_votes ??
        breakdown.governance_votes ??
        breakdown.governanceVotes ??
        raw.governanceVotes ??
        0
    ),
    platform_tenure_days: Number(
      raw.platform_tenure_days ??
        breakdown.platform_tenure_days ??
        breakdown.platformTenureDays ??
        raw.platformTenureDays ??
        raw.tenure_days ??
        0
    ),
    history: normalizeReputationHistory(raw.history ?? raw.score_history ?? raw),
  };
}

function normalizeInvoiceDemandMetrics(raw: any, invoiceId: string): InvoiceDemandMetrics {
  return {
    invoice_id: raw.invoice_id ?? raw.invoiceId ?? invoiceId,
    investor_count: Number(raw.investor_count ?? raw.investorCount ?? 0),
    raised_last_24h: Number(
      raw.raised_last_24h ?? raw.raisedLast24h ?? raw.last_24h ?? 0
    ),
    raised: Number(raw.raised ?? raw.funded ?? 0),
    target: Number(raw.target ?? raw.amount ?? raw.face_value ?? 0),
    funded_at: raw.funded_at ?? raw.fundedAt ?? null,
  };
}

/** Coerces an API value to a finite number, or null when it is not one. */
function toFiniteNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

/**
 * Normalises the NAV payload (#546).
 *
 * The endpoint has shipped under a few field spellings, so each value is read
 * from the names it could plausibly carry. A payload with neither a NAV nor a
 * price is treated as "no NAV" so the UI stays hidden rather than rendering
 * empty figures.
 */
function normalizeInvoiceNav(raw: any, invoiceId: string): InvoiceNav | null {
  if (!raw || typeof raw !== "object") return null;

  const nav = toFiniteNumberOrNull(
    raw.nav_per_fraction ?? raw.navPerFraction ?? raw.nav ?? raw.fair_value ?? raw.fairValue
  );
  const price = toFiniteNumberOrNull(
    raw.current_price ??
      raw.currentPrice ??
      raw.price ??
      raw.fraction_price ??
      raw.fractionPrice
  );
  if (nav === null && price === null) return null;

  const computedAt =
    raw.computed_at ?? raw.computedAt ?? raw.as_of ?? raw.asOf ?? raw.updated_at ?? raw.updatedAt;

  return {
    invoice_id: raw.invoice_id ?? raw.invoiceId ?? invoiceId,
    nav_per_fraction: nav,
    current_price: price,
    computed_at: computedAt ? String(computedAt) : null,
  };
}

function normalizeInvoiceFundingProgress(raw: any, invoiceId: string): InvoiceFundingProgress {
  const target = Number(raw.target ?? raw.amount ?? raw.face_value ?? 0);
  const raised = Number(raw.raised ?? raw.funded ?? raw.raised_amount ?? 0);
  return {
    invoice_id: raw.invoice_id ?? raw.invoiceId ?? invoiceId,
    raised,
    target,
    investor_count: Number(raw.investor_count ?? raw.investorCount ?? 0),
    is_fully_funded:
      typeof raw.is_fully_funded === "boolean"
        ? raw.is_fully_funded
        : target > 0 && raised >= target,
  };
}

function normalizeInvoicePriceHistory(raw: any, invoiceId: string): InvoicePriceHistory {
  const list = Array.isArray(raw) ? raw : raw?.history ?? raw?.points ?? [];
  const rawCurrent = raw?.current_ask_price ?? raw?.currentAskPrice;
  return {
    invoice_id: String(raw?.invoice_id ?? raw?.invoiceId ?? invoiceId),
    current_ask_price:
      rawCurrent !== undefined && rawCurrent !== null ? Number(rawCurrent) : null,
    history: (Array.isArray(list) ? list : []).map(normalizeInvoicePriceHistoryPoint),
  };
}

function normalizeProtectionInfo(raw: any, invoiceId: string): InvoiceProtectionInfo {
  return {
    invoice_id: raw.invoice_id ?? raw.invoiceId ?? invoiceId,
    sell_tax_percentage: Number(
      raw.sell_tax_percentage ?? raw.sellTaxPercentage ?? raw.sell_tax ?? 0
    ),
    buyback_pool_balance: Number(
      raw.buyback_pool_balance ??
        raw.buybackPoolBalance ??
        raw.buyback_pool ??
        0
    ),
  };
}

function normalizeInvoiceRating(raw: any, invoiceId: string): InvoiceRatingSummary {
  return {
    invoice_id: raw.invoice_id ?? raw.invoiceId ?? invoiceId,
    average_rating: Number(raw.average_rating ?? raw.averageRating ?? raw.average ?? 0),
    rating_count: Number(raw.rating_count ?? raw.ratingCount ?? raw.count ?? 0),
    user_rating:
      raw.user_rating !== undefined && raw.user_rating !== null
        ? Number(raw.user_rating)
        : (raw.userRating !== undefined && raw.userRating !== null
          ? Number(raw.userRating)
          : null),
    distribution: normalizeRatingDistribution(raw.distribution ?? raw.star_distribution),
  };
}

function normalizeRatingDistribution(
  raw: any
): Record<1 | 2 | 3 | 4 | 5, number> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  return {
    1: Number(raw[1] ?? raw["1"] ?? 0),
    2: Number(raw[2] ?? raw["2"] ?? 0),
    3: Number(raw[3] ?? raw["3"] ?? 0),
    4: Number(raw[4] ?? raw["4"] ?? 0),
    5: Number(raw[5] ?? raw["5"] ?? 0),
  };
}

function normalizeIssuerEarningsSummary(raw: any): IssuerEarningsSummary {
  return {
    gross_proceeds: Number(raw.gross_proceeds ?? raw.grossProceeds ?? 0),
    platform_fee: Number(raw.platform_fee ?? raw.platformFee ?? 0),
    net_payout: Number(raw.net_payout ?? raw.netPayout ?? 0),
  };
}

function normalizeIssuerInvoiceEarning(raw: any): IssuerInvoiceEarning {
  return {
    invoice_id: raw.invoice_id ?? raw.invoiceId ?? raw.id ?? "",
    invoice_title: raw.invoice_title ?? raw.invoiceTitle ?? raw.title ?? "",
    face_value: Number(raw.face_value ?? raw.faceValue ?? raw.amount ?? 0),
    funded_date: raw.funded_date ?? raw.fundedDate ?? raw.funded_at ?? "",
    gross_proceeds: Number(raw.gross_proceeds ?? raw.grossProceeds ?? 0),
    platform_fee: Number(raw.platform_fee ?? raw.platformFee ?? 0),
    net_payout: Number(raw.net_payout ?? raw.netPayout ?? 0),
    payout_status: raw.payout_status ?? raw.payoutStatus ?? "pending",
    transaction_hash: raw.transaction_hash ?? raw.transactionHash ?? undefined,
  };
}

function normalizeLeaderboardInvestor(raw: any): LeaderboardInvestor {
  return {
    address:
      raw.address ?? raw.wallet ?? raw.wallet_address ?? raw.walletAddress ?? "",
    total_committed:
      raw.total_committed ?? raw.totalCommitted ?? raw.total ?? 0,
    invoice_count:
      raw.invoice_count ?? raw.invoiceCount ?? raw.invoices_count ?? 0,
  };
}

function normalizePlatformActivityEvent(raw: any): PlatformActivityEvent {
  return {
    id: String(raw.id ?? raw.event_id ?? raw.eventId ?? ""),
    type: normalizePlatformActivityType(
      raw.type ?? raw.event_type ?? raw.eventType
    ),
    invoice_id: String(
      raw.invoice_id ?? raw.invoiceId ?? raw.invoice ?? ""
    ),
    title: String(raw.title ?? raw.invoice_title ?? raw.description ?? ""),
    amount:
      raw.amount !== undefined && raw.amount !== null
        ? Number(raw.amount)
        : undefined,
    created_at: String(
      raw.created_at ?? raw.createdAt ?? raw.timestamp ?? ""
    ),
  };
}

function buildResaleListingParams(filters: ResaleListingFilters = {}): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.invoiceType && filters.invoiceType !== "all") {
    params.set("invoice_type", filters.invoiceType);
  }
  if (filters.minYield !== undefined && filters.minYield > 0) {
    params.set("min_yield", String(filters.minYield));
  }
  if (filters.maxYield !== undefined && filters.maxYield > 0) {
    params.set("max_yield", String(filters.maxYield));
  }
  if (filters.minPrice !== undefined && filters.minPrice > 0) {
    params.set("min_price", String(filters.minPrice));
  }
  if (filters.maxPrice !== undefined && filters.maxPrice > 0) {
    params.set("max_price", String(filters.maxPrice));
  }
  if (filters.maxDaysToMaturity !== undefined && filters.maxDaysToMaturity > 0) {
    params.set("max_days_to_maturity", String(filters.maxDaysToMaturity));
  }
  return params;
}

function normalizeResaleListing(raw: any): ResaleListing {
  const quantity = Number(raw.quantity ?? raw.shares ?? raw.shares_offered ?? 0);
  const remaining = Number(
    raw.remaining_quantity ?? raw.remaining ?? raw.shares_remaining ?? quantity
  );

  return {
    id: String(raw.id ?? raw.listing_id),
    invoice_id: String(raw.invoice_id ?? raw.invoiceId ?? ""),
    invoice_title: String(raw.invoice_title ?? raw.invoiceTitle ?? raw.title ?? ""),
    invoice_type: String(raw.invoice_type ?? raw.invoiceType ?? "other"),
    seller: String(raw.seller ?? raw.seller_address ?? ""),
    quantity,
    remaining_quantity: remaining,
    ask_price: Number(raw.ask_price ?? raw.askPrice ?? raw.price ?? 0),
    maturity_value: Number(
      raw.maturity_value ?? raw.maturityValue ?? raw.face_value ?? 0
    ),
    maturity_date: String(raw.maturity_date ?? raw.maturityDate ?? raw.due_date ?? ""),
    listed_at: String(raw.listed_at ?? raw.listedAt ?? raw.created_at ?? ""),
    status: (raw.status ?? "active") as ResaleListingStatus,
  };
}

function normalizeKycStatus(raw: any): KycStatus {
  const v = String(raw ?? "").toLowerCase().replace(/[-\s]/g, "_");
  if ((KYC_STATUSES as string[]).includes(v)) return v as KycStatus;
  if (v === "notsubmitted" || v === "none" || v === "missing") return "not_submitted";
  if (v === "in_review" || v === "inreview" || v === "under_review") return "flagged";
  return "not_submitted";
}

const ADMIN_USER_ACCREDITATION_TIERS: AdminUserRowExtended["accreditation_tier"][] = [
  "unaccredited",
  "accredited",
  "qualified",
];

function normalizeDividendCycle(raw: any): DividendCycle {
  const cycle = String(raw.cycle ?? raw.cycle_id ?? raw.cycleId ?? raw.id ?? "");
  const amount = Number(raw.amount ?? raw.claimable_amount ?? 0);
  const distribution_date = String(
    raw.distribution_date ?? raw.distributionDate ?? raw.date ?? raw.created_at ?? ""
  );
  const claimed = Boolean(raw.claimed ?? false);
  return {
    cycle,
    cycle_id: raw.cycle_id ?? raw.cycleId ?? cycle,
    amount,
    distribution_date,
    claimable: typeof raw.claimable === "boolean" ? raw.claimable : !claimed,
    claimed,
    transaction_hash: raw.transaction_hash ?? raw.transactionHash ?? null,
  };
}

function normalizeDividendClaimRecord(raw: any): DividendClaimRecord {
  return {
    cycle: String(raw.cycle ?? raw.cycle_id ?? ""),
    amount: Number(raw.amount ?? 0),
    claimed_at: String(raw.claimed_at ?? raw.claimedAt ?? raw.date ?? ""),
    transaction_hash: String(raw.transaction_hash ?? raw.transactionHash ?? raw.tx_hash ?? ""),
  };
}

function normalizeAccreditationTier(raw: any): AccreditationTier {
  const v = String(raw ?? "").toLowerCase();
  if ((ACCREDITATION_TIERS as string[]).includes(v)) return v as AccreditationTier;
  if (v === "none" || v === "basic") return "unaccredited";
  if (v === "standard" || v === "verified") return "accredited";
  if (v === "institutional" || v === "sophisticated") return "qualified";
  return "unaccredited";
}

function normalizeFeeTierEntry(raw: any): FeeTierEntry {
  return {
    tier: String(raw.tier ?? raw.label ?? raw.name ?? ""),
    min_volume: Number(raw.min_volume ?? raw.minVolume ?? raw.threshold ?? 0),
    fee_percentage: Number(
      raw.fee_percentage ?? raw.feePercentage ?? raw.fee ?? 0
    ),
  };
}

export const FEE_TIERS: FeeTierEntry[] = [
  { tier: "Standard", min_volume: 0, fee_percentage: 2.5 },
  { tier: "Silver", min_volume: 100_000, fee_percentage: 2.0 },
  { tier: "Gold", min_volume: 500_000, fee_percentage: 1.5 },
  { tier: "Platinum", min_volume: 1_000_000, fee_percentage: 1.0 },
];

function normalizeReputationHistory(raw: any): ReputationScoreHistoryPoint[] {
  const list = Array.isArray(raw) ? raw : raw?.history ?? raw?.points ?? [];
  return (Array.isArray(list) ? list : []).map((p: any) => ({
    date: String(p.date ?? p.timestamp ?? p.created_at ?? ""),
    score: Number(p.score ?? p.value ?? 0),
  }));
}

function normalizeInvoicePriceHistoryPoint(raw: any): InvoicePriceHistoryPoint {
  return {
    date: String(raw.date ?? raw.timestamp ?? raw.listed_at ?? raw.created_at ?? ""),
    price: Number(raw.price ?? raw.ask_price ?? raw.askPrice ?? 0),
    quantity: Number(raw.quantity ?? raw.qty ?? 0),
  };
}

function normalizePlatformActivityType(raw: any): PlatformActivityEventType {
  const v = String(raw ?? "").toLowerCase();
  if ((PLATFORM_ACTIVITY_TYPES as string[]).includes(v))
    return v as PlatformActivityEventType;
  // Tolerate backend aliases.
  if (v === "investment" || v === "new investment") return "new_investment";
  if (v === "funded" || v === "invoice fully funded") return "invoice_funded";
  if (v === "settled" || v === "settlement") return "invoice_settled";
  if (v === "listing" || v === "new invoice") return "new_listing";
  return "new_listing";
}

export type ResaleListingStatus = "active" | "sold" | "cancelled";

const KYC_STATUSES: KycStatus[] = [
  "pending",
  "approved",
  "rejected",
  "flagged",
  "not_submitted",
];

const ACCREDITATION_TIERS: AccreditationTier[] = [
  "unaccredited",
  "accredited",
  "qualified",
];

const PLATFORM_ACTIVITY_TYPES: PlatformActivityEventType[] = [
  "new_investment",
  "invoice_funded",
  "invoice_settled",
  "new_listing",
];

// ---------------------------------------------------------------------------
// Maturity extension proposals
// ---------------------------------------------------------------------------

export interface ExtensionProposal {
  id: string;
  invoice_id: string;
  proposed_maturity_date: string;
  reason: string;
  votes_for: number;
  votes_against: number;
  quorum: number;
  total_weight: number;
  ends_at: string;
  status: "active" | "executed" | "rejected";
}

export async function fetchExtensionProposal(
  invoiceId: string
): Promise<ExtensionProposal | null> {
  const res = await fetch(
    `${API_BASE}/invoices/${encodeURIComponent(invoiceId)}/extension-proposal`
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch extension proposal");
  return res.json();
}

export async function proposeExtension(
  invoiceId: string,
  body: { proposed_maturity_date: string; reason: string },
  token?: string
): Promise<ExtensionProposal> {
  const res = await fetch(
    `${API_BASE}/invoices/${encodeURIComponent(invoiceId)}/extension-proposal`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(token) },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to propose extension"));
  return res.json();
}

export async function voteOnExtension(
  proposalId: string,
  body: { wallet: string; support: boolean },
  token?: string
): Promise<ExtensionProposal> {
  const res = await fetch(
    `${API_BASE}/extension-proposals/${encodeURIComponent(proposalId)}/votes`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(token) },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) throw new Error(await readErrorMessage(res, "Failed to submit vote"));
  return res.json();
}

// ---------------------------------------------------------------------------
// Issuer blacklist
// ---------------------------------------------------------------------------

export interface IssuerBlacklistStatus {
  is_blacklisted: boolean;
  reason: string | null;
  blacklisted_at: string | null;
}

export async function fetchIssuerBlacklist(wallet: string): Promise<IssuerBlacklistStatus> {
  const res = await fetch(`${API_BASE}/issuers/${encodeURIComponent(wallet)}/blacklist`);
  if (res.status === 404) return { is_blacklisted: false, reason: null, blacklisted_at: null };
  if (!res.ok) throw new Error("Failed to fetch issuer blacklist status");
  const raw = await res.json();
  return {
    is_blacklisted: Boolean(raw.is_blacklisted ?? raw.isBlacklisted),
    reason: raw.reason ?? null,
    blacklisted_at: raw.blacklisted_at ?? raw.blacklistedAt ?? null,
  };
}

/* ─── Investor onboarding bonus (#529) ─────────────────────────────────────── */

export interface OnboardingBonus {
  /** `true` once the wallet has claimed the bonus on its first investment. */
  is_claimed: boolean;
  /** Bonus yield in basis points; the chip falls back to 50 (0.5%) when absent. */
  bonus_yield_bps?: number;
}

/** Resolves `null` when the backend has no record of the wallet (404). */
export async function fetchOnboardingBonus(wallet: string): Promise<OnboardingBonus | null> {
  const res = await fetch(`${API_BASE}/investors/${encodeURIComponent(wallet)}/onboarding-bonus`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch onboarding bonus");
  return res.json();
}

/* ─── Investor alert preferences (#531) ────────────────────────────────────── */

export interface AlertPreferences {
  settlement: boolean;
  kyc_expiry: boolean;
  watchlist_change: boolean;
  auto_invest: boolean;
  maturity_approaching: boolean;
}

/** Full alert payload: the per-event toggles plus the maturity reminder days (#542). */
export interface AlertPreferencesPayload extends AlertPreferences {
  /** Days before maturity that trigger a reminder, e.g. `[30, 7]`. */
  maturity_reminder_days: number[];
}

/** Resolves `null` for a wallet that has never saved preferences (404). */
export async function fetchAlertPreferences(
  wallet: string,
  token?: string,
): Promise<Partial<AlertPreferencesPayload> | null> {
  const res = await fetch(`${API_BASE}/investors/${encodeURIComponent(wallet)}/alert-preferences`, {
    headers: authHeaders(token),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch alert preferences");
  return res.json();
}

export interface SetAlertPreferencesResult {
  success: boolean;
  /** Soroban transaction hash for the `set_alert_preferences` call. */
  tx_hash?: string;
}

/** Submits the `set_alert_preferences` contract call with every toggle state. */
export async function setAlertPreferences(
  wallet: string,
  preferences: AlertPreferencesPayload,
  token?: string,
): Promise<SetAlertPreferencesResult> {
  const res = await fetch(`${API_BASE}/investors/${encodeURIComponent(wallet)}/alert-preferences`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(preferences),
  });
  if (!res.ok) throw new Error("Failed to save alert preferences");
  return res.json();
}

/* ─── Invoice performance leaderboard (#527) ───────────────────────────────── */

export const INVOICE_LEADERBOARD_METRICS = [
  "yield_rate",
  "settlement_speed",
  "issuer_reputation",
] as const;
export type InvoiceLeaderboardMetric = (typeof INVOICE_LEADERBOARD_METRICS)[number];

export interface InvoiceLeaderboardEntry {
  invoice_id: string;
  invoice_name: string;
  issuer: string;
  /** Yield %, average settlement days, or reputation 0-100, per the metric. */
  metric_value: number;
  sector: string;
}

export async function fetchInvoiceLeaderboard(
  metric: InvoiceLeaderboardMetric,
): Promise<InvoiceLeaderboardEntry[]> {
  const res = await fetch(
    `${API_BASE}/analytics/invoices/leaderboard?metric=${encodeURIComponent(metric)}`,
  );
  if (!res.ok) throw new Error("Failed to fetch invoice leaderboard");
  return res.json();
}
