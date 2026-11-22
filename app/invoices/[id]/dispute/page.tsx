"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DisputeEvidenceTimeline } from "@/components/invoices/DisputeEvidenceTimeline";
import { usePageTitle } from "@/hooks/usePageTitle";

/** Invoice dispute evidence timeline route (issue #695). */
export default function InvoiceDisputePage() {
  const params = useParams<{ id: string }>();
  usePageTitle(`Dispute timeline #${params.id}`);

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8 pb-24 space-y-6">
      <Link
        href={`/invoices/${encodeURIComponent(params.id)}`}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to Invoice Details</span>
      </Link>
      <DisputeEvidenceTimeline invoiceId={params.id} />
    </main>
  );
}
