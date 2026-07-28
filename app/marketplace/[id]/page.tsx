"use client";

import { useParams } from "next/navigation";
import { InvoiceDetail } from "@/components/invoices";

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  return (
    <main className="container mx-auto px-4 py-8">
      <InvoiceDetail invoiceId={params.id} />
    </main>
  );
}
