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

