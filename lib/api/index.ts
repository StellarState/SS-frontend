import type { Invoice, Investment, InvestmentRequest } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export async function fetchInvoices(): Promise<Invoice[]> {
  const res = await fetch(`${API_URL}/invoices`);
  if (!res.ok) throw new Error("Failed to fetch invoices");
  return res.json();
}

export async function fetchInvoice(id: string): Promise<Invoice> {
  const res = await fetch(`${API_URL}/invoices/${id}`);
  if (!res.ok) throw new Error("Failed to fetch invoice");
  return res.json();
}

export async function createInvestment(
  data: InvestmentRequest
): Promise<Investment> {
  const res = await fetch(`${API_URL}/investments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create investment");
  return res.json();
}
