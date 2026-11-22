"use client";
/**
 * Invoice Q&A data layer (issue #625)
 *
 * Paginated questions list with cursor-based pagination, plus mutations for
 * asking, answering, and reporting questions/answers.
 */
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export interface InvoiceQuestion {
  id: string;
  invoiceId: string;
  authorId: string;
  text: string;
  createdAt: string;
  answer?: {
    id: string;
    text: string;
    createdAt: string;
    editedAt?: string | null;
  } | null;
}

export interface QuestionsPage {
  questions: InvoiceQuestion[];
  nextCursor: string | null;
  hasMore: boolean;
}

export const questionsQueryKey = (invoiceId: string) =>
  ["invoice", invoiceId, "questions"] as const;

/** Fetches one page of questions for an invoice. */
async function fetchInvoiceQuestions(
  invoiceId: string,
  cursor?: string
): Promise<QuestionsPage> {
  const params = new URLSearchParams({ limit: "20" });
  if (cursor) params.set("cursor", cursor);
  const res = await fetch(
    `${API_BASE}/invoices/${encodeURIComponent(invoiceId)}/questions?${params}`
  );
  if (!res.ok) throw new Error("Failed to fetch questions");
  return res.json();
}

/** Paginated question list — refetch on mutation via queryClient. */
export function useInvoiceQuestions(invoiceId: string) {
  return useInfiniteQuery({
    queryKey: questionsQueryKey(invoiceId),
    queryFn: ({ pageParam }) =>
      fetchInvoiceQuestions(invoiceId, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
    enabled: Boolean(invoiceId),
  });
}

/** POST /api/invoices/{id}/questions */
export function useAskQuestionMutation(invoiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch(
        `${API_BASE}/invoices/${encodeURIComponent(invoiceId)}/questions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        }
      );
      if (!res.ok) throw new Error("Failed to submit question");
      return res.json() as Promise<InvoiceQuestion>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionsQueryKey(invoiceId) });
      toast.success("Question submitted");
    },
    onError: () => {
      toast.error("Failed to submit question");
    },
  });
}

/** POST /api/questions/{qId}/answers */
export function useAnswerQuestionMutation(invoiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ questionId, text }: { questionId: string; text: string }) => {
      const res = await fetch(
        `${API_BASE}/questions/${encodeURIComponent(questionId)}/answers`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        }
      );
      if (!res.ok) throw new Error("Failed to submit answer");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionsQueryKey(invoiceId) });
      toast.success("Answer posted");
    },
    onError: () => {
      toast.error("Failed to post answer");
    },
  });
}

export type ReportReason = "Spam" | "Misleading" | "Inappropriate";

/** POST /api/questions/{qId}/report */
export function useReportQuestionMutation() {
  return useMutation({
    mutationFn: async ({
      questionId,
      reason,
    }: {
      questionId: string;
      reason: ReportReason;
    }) => {
      const res = await fetch(
        `${API_BASE}/questions/${encodeURIComponent(questionId)}/report`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        }
      );
      if (!res.ok) throw new Error("Failed to report question");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Report submitted");
    },
    onError: () => {
      toast.error("Failed to submit report");
    },
  });
}
