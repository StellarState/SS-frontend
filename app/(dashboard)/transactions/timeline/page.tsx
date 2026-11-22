"use client";

import React from "react";
import { TransactionAuditTimeline } from "@/components/transactions/TransactionAuditTimeline";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function TransactionTimelinePage() {
  usePageTitle("Transaction Audit Timeline");

  return (
    <main className="container mx-auto px-4 py-8">
      <TransactionAuditTimeline />
    </main>
  );
}
