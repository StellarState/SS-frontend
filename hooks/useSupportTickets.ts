"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export type TicketStatus = "open" | "in-progress" | "resolved";

export interface SupportTicket {
  id: string;
  category: string;
  subject: string;
  description: string;
  status: TicketStatus;
  updatedAt: string;
  createdAt: string;
}

export interface TicketMessage {
  id: string;
  sender: string;
  body: string;
  timestamp: string;
}

export interface TicketDetail extends SupportTicket {
  messages: TicketMessage[];
}

export interface CreateTicketPayload {
  category: string;
  subject: string;
  description: string;
  files?: File[];
  invoiceId?: string;
  txHash?: string;
}

export const SUPPORT_TICKETS_QUERY_KEY = ["support-tickets"] as const;
export const supportTicketDetailKey = (id: string) =>
  ["support-ticket", id] as const;

export function useSupportTickets() {
  return useQuery<SupportTicket[]>({
    queryKey: SUPPORT_TICKETS_QUERY_KEY,
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/support/tickets`);
      if (!res.ok) throw new Error("Failed to fetch support tickets");
      return res.json();
    },
    staleTime: 60 * 1000,
  });
}

export function useSupportTicketDetail(id: string) {
  return useQuery<TicketDetail>({
    queryKey: supportTicketDetailKey(id),
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/support/tickets/${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error("Failed to fetch ticket detail");
      return res.json();
    },
    enabled: id.length > 0,
    staleTime: 30 * 1000,
  });
}

export function useCreateSupportTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateTicketPayload) => {
      const form = new FormData();
      form.append("category", payload.category);
      form.append("subject", payload.subject);
      form.append("description", payload.description);
      if (payload.invoiceId) form.append("invoiceId", payload.invoiceId);
      if (payload.txHash) form.append("txHash", payload.txHash);
      if (payload.files) {
        for (const file of payload.files) {
          form.append("files", file);
        }
      }
      const res = await fetch(`${API_BASE}/support/tickets`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error("Failed to create support ticket");
      return res.json() as Promise<SupportTicket>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUPPORT_TICKETS_QUERY_KEY });
      toast.success("Support ticket submitted");
    },
    onError: () => {
      toast.error("Failed to submit ticket. Please try again.");
    },
  });
}

export function useReplySupportTicket(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      const res = await fetch(
        `${API_BASE}/support/tickets/${encodeURIComponent(ticketId)}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        }
      );
      if (!res.ok) throw new Error("Failed to send reply");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: supportTicketDetailKey(ticketId),
      });
    },
    onError: () => {
      toast.error("Failed to send reply. Please try again.");
    },
  });
}
