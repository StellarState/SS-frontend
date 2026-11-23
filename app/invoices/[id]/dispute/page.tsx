"use client";

import { useParams } from "next/navigation";
import { DisputeEvidenceTimeline } from "@/components/invoices/DisputeEvidenceTimeline";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function InvoiceDisputePage() {
  const params = useParams<{ id: string }>();
  usePageTitle("Invoice Dispute Evidence Timeline");

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8 pb-24">
      <DisputeEvidenceTimeline invoiceId={params.id} />
    </main>
  );
}
