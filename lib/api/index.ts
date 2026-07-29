export interface Invoice {
  id: string;
  title: string;
  seller: string;
  amount: number;
  raised: number;
  investor_count: number;
  status: "open" | "funded" | "settled";
  due_date: string;
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

export async function fetchInvoices(cursor?: string): Promise<InvoicesResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
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
