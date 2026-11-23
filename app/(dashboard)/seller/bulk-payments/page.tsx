"use client";

import { usePageTitle } from "@/hooks/usePageTitle";
import { BulkPaymentScheduler } from "@/components/payment/BulkPaymentScheduler";

export default function BulkPaymentsPage() {
  usePageTitle("Bulk Invoice Payment Scheduler");

  return (
    <main className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bulk Payment Scheduling</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Import and schedule multi-invoice settlements across date ranges with balance verification.
        </p>
      </div>

      <BulkPaymentScheduler />
    </main>
  );
}
