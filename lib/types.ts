export type InvoiceStatus = "open" | "funded" | "settled";

export interface Invoice {
  id: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  sellerId: string;
  sellerName: string;
  deadline: string | null;
  createdAt: string;
  updatedAt: string;
  riskScore?: number;
}

export interface Investment {
  id: string;
  invoiceId: string;
  investorId: string;
  amount: number;
  txHash: string | null;
  status: "pending" | "confirmed" | "failed";
  createdAt: string;
  confirmedAt: string | null;
}

export interface InvestmentRequest {
  invoiceId: string;
  amount: number;
}
