export interface Invoice {
  id: string;
  title: string;
  seller: string;
  amount: number;
  raised: number;
  investor_count: number;
  status: "open" | "funded" | "settled" | "rejected" | "draft";
  due_date: string;
  yield_percentage?: number;
  rejection_reason?: string;
  has_more: boolean;
  next_cursor: string | null;
}

export interface InvoiceDetail extends Invoice {
  description: string;
  investors: { address: string; amount: number; timestamp: string }[];
  document_url: string;
}

export interface InvoicesResponse {
  invoices: Invoice[];
  has_more: boolean;
  next_cursor: string | null;
}

import type { InvestmentPosition } from "@/lib/portfolio";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export async function fetchInvoices(
  cursor?: string,
  paramsObj?: Record<string, string>
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
  if (!res.ok) throw new Error("Failed to fetch invoice detail");
  return res.json();
}

export async function investInInvoice(
  invoiceId: string,
  amount: number
): Promise<{ success: boolean; invested_amount: number }> {
  const res = await fetch(`${API_BASE}/invoices/${invoiceId}/invest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount }),
  });
  if (!res.ok) throw new Error("Investment failed");
  return res.json();
}

export type NotificationEventType = "new_invoice" | "funding_milestone" | "settlement";
export type NotificationChannel = "email" | "in_app";

export interface NotificationPreference {
  event_type: NotificationEventType;
  email: boolean;
  in_app: boolean;
}

export async function fetchNotificationPreferences(): Promise<NotificationPreference[]> {
  const res = await fetch(`${API_BASE}/notifications/preferences`);
  if (!res.ok) throw new Error("Failed to fetch notification preferences");
  return res.json();
}

export interface IpfsUploadResult {
  cid: string;
  url: string;
}

export async function uploadDocumentToIpfs(file: File): Promise<IpfsUploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/ipfs/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Document upload failed");
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
  input: PublishInvoiceInput
): Promise<PublishInvoiceResult> {
  const res = await fetch(`${API_BASE}/invoices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Failed to publish invoice");
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

export interface SellerKycStatus {
  status: SellerKycStatusValue;
  rejection_reason?: string | null;
  rejectionReason?: string | null;
  reason?: string | null;
}

function normalizeSellerKycStatus(raw: any): SellerKycStatus {
  return {
    status: raw.status ?? raw.kyc_status ?? raw.kycStatus ?? "not_submitted",
    rejection_reason:
      raw.rejection_reason ?? raw.rejectionReason ?? raw.reason ?? null,
  };
}

export async function fetchSellerKycStatus(
  token?: string
): Promise<SellerKycStatus> {
  const res = await fetch(`${API_BASE}/kyc/status`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch KYC status");
  return normalizeSellerKycStatus(await res.json());
}

export async function updateNotificationPreference(
  eventType: NotificationEventType,
  channel: NotificationChannel,
  enabled: boolean
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/notifications/preferences/${eventType}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channel, enabled }),
  });
  if (!res.ok) throw new Error("Failed to update notification preference");
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
  token?: string
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
  token?: string
): Promise<{ success: boolean }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/admin/invoices/${invoiceId}/approve`, {
    method: "POST",
    headers,
  });
  if (!res.ok) throw new Error("Failed to approve invoice");
  return res.json();
}

export async function rejectAdminInvoice(
  invoiceId: string,
  reason: string,
  token?: string
): Promise<{ success: boolean }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/admin/invoices/${invoiceId}/reject`, {
    method: "POST",
    headers,
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error("Failed to reject invoice");
  return res.json();
}

export interface PayoutRecord {
  invoiceId: string;
  sellerName: string;
  amountInvested: number;
  amountReceived: number;
  yield: number;
  settledAt: string;
}

export interface PayoutsResponse {
  payouts: PayoutRecord[];
  has_more: boolean;
  next_cursor: string | null;
}

export async function fetchInvestorPayouts(
  cursor?: string
): Promise<PayoutsResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);

  const res = await fetch(`${API_BASE}/investor/payouts?${params}`);
  if (!res.ok) throw new Error("Failed to fetch payout history");
  return res.json();
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
  token?: string
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
  token?: string
): Promise<GovernanceProposalsResponse> {
  const params = new URLSearchParams({ status });
  const res = await fetch(`${API_BASE}/keys/${keyId}/proposals?${params}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch governance proposals");
  const payload = await res.json();
  const proposals = Array.isArray(payload) ? payload : payload.proposals ?? [];
  return { proposals: proposals.map(normalizeProposal) };
}

export async function fetchKeyWhitelistStatus(
  keyId: string,
  walletAddress: string,
  token?: string
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
  token?: string
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
  token?: string
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
  token?: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/keys/${keyId}/proposals/${proposalId}/votes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify({ optionIndex, wallet: walletAddress }),
  });
  if (!res.ok) throw new Error("Failed to cast vote");
  return res.json();
}

export async function burnCreatorKey(
  keyId: string,
  quantity: number,
  walletAddress: string,
  token?: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/keys/${keyId}/burn`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify({ quantity, wallet: walletAddress }),
  });
  if (!res.ok) throw new Error("Failed to burn key");
  return res.json();
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
  token?: string
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
  token?: string
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
  token?: string
): Promise<VestingSchedule | null> {
  const res = await fetch(
    `${API_BASE}/vesting/${keyId}/${encodeURIComponent(walletAddress)}`,
    { headers: authHeaders(token) }
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
  token?: string
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
    }
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
  token?: string
): Promise<AuditLogResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  if (actionType) params.set("actionType", actionType);

  const res = await fetch(`${API_BASE}/admin/audit-log?${params}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch audit log");
  const payload = await res.json();
  const entries = Array.isArray(payload) ? payload : payload.entries ?? [];

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

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const payload = await res.json();
    return payload?.message ?? payload?.error ?? fallback;
  } catch {
    return fallback;
  }
}

export async function updateKeySupplyCap(
  keyId: string,
  supplyCap: number,
  token?: string
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
        "Supply cap conflicts with the current circulating supply"
      )
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
    totalRoyaltyEarned:
      raw.totalRoyaltyEarned ?? raw.total_royalty_earned ?? 0,
    buyRoyaltyEarned: raw.buyRoyaltyEarned ?? raw.buy_royalty_earned ?? 0,
    sellRoyaltyEarned: raw.sellRoyaltyEarned ?? raw.sell_royalty_earned ?? 0,
    tradeCount: raw.tradeCount ?? raw.trade_count ?? 0,
    monthlyBreakdown: monthly.map(normalizeMonthlyRevenue),
  };
}

export async function fetchCreatorRevenue(
  keyId: string,
  token?: string
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
  const rawStatus = raw.status ?? (raw.executedAt || raw.executed_at ? "executed" : "pending");

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
  token?: string
): Promise<TimelockProposalsResponse> {
  const res = await fetch(`${API_BASE}/admin/timelock/proposals`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch timelock proposals");
  const payload = await res.json();
  const proposals = Array.isArray(payload) ? payload : payload.proposals ?? [];
  return { proposals: proposals.map(normalizeTimelockProposal) };
}

export async function executeTimelockProposal(
  proposalId: string,
  token?: string
): Promise<{ success: boolean }> {
  const res = await fetch(
    `${API_BASE}/admin/timelock/proposals/${proposalId}/execute`,
    {
      method: "POST",
      headers: authHeaders(token),
    }
  );
  if (!res.ok) throw new Error("Failed to execute timelock proposal");
  return res.json();
}

export async function cancelTimelockProposal(
  proposalId: string,
  token?: string
): Promise<{ success: boolean }> {
  const res = await fetch(
    `${API_BASE}/admin/timelock/proposals/${proposalId}/cancel`,
    {
      method: "POST",
      headers: authHeaders(token),
    }
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
  fallbackAmount: number
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
  token?: string
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
