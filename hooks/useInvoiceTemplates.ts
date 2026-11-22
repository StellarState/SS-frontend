"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteInvoiceTemplate,
  listInvoiceTemplates,
  saveInvoiceTemplate,
} from "@/lib/api/invoiceTemplates";
import { somaQueryKeys } from "@/lib/somaQueryKeys";
import type { InvoiceTemplate } from "@/lib/invoiceTemplates";

export function useInvoiceTemplates() {
  const queryClient = useQueryClient();
  const templates = useQuery({
    queryKey: somaQueryKeys.invoiceTemplates,
    queryFn: listInvoiceTemplates,
    staleTime: 30_000,
  });

  const setTemplates = (next: InvoiceTemplate[]) => {
    queryClient.setQueryData(somaQueryKeys.invoiceTemplates, next);
  };

  const save = useMutation({
    mutationFn: (template: InvoiceTemplate) => saveInvoiceTemplate(template),
    onSuccess: setTemplates,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteInvoiceTemplate(id),
    onSuccess: setTemplates,
  });

  return {
    ...templates,
    saveTemplate: save.mutateAsync,
    deleteTemplate: remove.mutateAsync,
    isSaving: save.isPending,
    isDeleting: remove.isPending,
  };
}
