"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { fetchInvoiceDetail } from "@/lib/api";
import { duplicateInvoice } from "@/lib/invoiceTemplates";

export const DUPLICATE_STORAGE_KEY = "ss:duplicate-invoice:v1";

/** Copies reusable fields into the publish form and clears unique fields. */
export function DuplicateInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const duplicate = async () => {
    setIsLoading(true);
    try {
      const invoice = await fetchInvoiceDetail(invoiceId);
      const copy = duplicateInvoice({
        title: invoice.title,
        description: invoice.description ?? "",
        faceValue: String(invoice.amount),
        debtor: invoice.debtor_id ?? invoice.debtor_hash ?? "",
        terms: invoice.terms ?? "",
      });
      window.sessionStorage.setItem(DUPLICATE_STORAGE_KEY, JSON.stringify(copy));
      router.push("/seller/publish?duplicate=1");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={duplicate}
      disabled={isLoading}
      data-testid={`duplicate-invoice-${invoiceId}`}
    >
      {isLoading ? "Copying..." : "Duplicate"}
    </Button>
  );
}
