"use client";
import { useQuery } from "@tanstack/react-query";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export type AckStatus = "acknowledged" | "pending" | "not_required" | "revoked";

export interface DebtorAckData {
  requireAck: boolean;
  status: AckStatus;
  acknowledgedAt?: string;
  recordUrl?: string;
}

export const debtorAckQueryKey = (invoiceId: string) =>
  ["debtor-ack", invoiceId] as const;

export function useDebtorAck(invoiceId: string) {
  return useQuery<DebtorAckData>({
    queryKey: debtorAckQueryKey(invoiceId),
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE}/invoices/${encodeURIComponent(invoiceId)}/ack`
      );
      if (!res.ok) throw new Error("Failed to fetch debtor acknowledgement");
      return res.json();
    },
    enabled: invoiceId.length > 0,
    staleTime: 60 * 1000,
  });
}
