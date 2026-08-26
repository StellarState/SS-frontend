"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { investInInvoice } from "@/lib/api";
import type { InvoiceDetail } from "@/lib/api";
import { toast } from "sonner";
import { INVOICES_QUERY_KEY } from "./useInvoices";

interface InvestMutationVars {
  invoiceId: string;
  amount: number;
}

export function useInvestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ invoiceId, amount }: InvestMutationVars) =>
      investInInvoice(invoiceId, amount),

    onMutate: async ({ invoiceId, amount }) => {
      await queryClient.cancelQueries({ queryKey: ["invoice", invoiceId] });

      const previous = queryClient.getQueryData<InvoiceDetail>(["invoice", invoiceId]);

      if (previous) {
        queryClient.setQueryData<InvoiceDetail>(["invoice", invoiceId], (old) => {
          if (!old) return old;
          const newRaised = Math.min(old.raised + amount, old.amount);
          return { ...old, raised: newRaised, investor_count: old.investor_count + 1 };
        });
      }

      return { previous };
    },

    onError: (_err, { invoiceId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["invoice", invoiceId], context.previous);
      }
      toast.error("Investment failed. Your progress bar has been restored.");
    },

    onSuccess: (_data, { amount }) => {
      toast.success(`Investment of ${amount.toLocaleString()} XLM committed successfully`, {
        duration: 5000,
      });
    },

    onSettled: (_data, _error, { invoiceId }) => {
      queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEY });
    },
  });
}
