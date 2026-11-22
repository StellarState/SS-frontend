"use client";

import React from "react";
import { TransactionAuditTimeline } from "@/components/transactions/TransactionAuditTimeline";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function TransactionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  usePageTitle(`Transaction ${params.id}`);

  return (
    <main className="container mx-auto px-4 py-8">
      <TransactionAuditTimeline />
    </main>
  );
}
