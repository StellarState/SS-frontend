"use client";

import { TransactionJournalExport } from "@/components/admin/TransactionJournalExport";
import { usePageTitle } from "@/hooks/usePageTitle";

/**
 * Reconciliation Transaction Journal Export Page (Issue #676).
 *
 * Provides institutions and auditors with downloadable accounting journals
 * in CSV and Excel (SpreadsheetML) formats, complete with reconciliation batch IDs,
 * strict currency precision, and formula injection defense.
 */
export default function TransactionJournalPage() {
  usePageTitle("Transaction Journal");

  return (
    <main className="container mx-auto px-4 py-8 pb-24 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Reconciliation Journal</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Download institutional accounting logs with reconciliation batch IDs, multi-criteria filtering, and formula protection.
        </p>
      </header>

      <TransactionJournalExport />
    </main>
  );
}
