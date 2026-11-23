"use client";

import { EscapeWithdrawPage } from "@/components/escape/EscapeWithdrawPage";
import { usePageTitle } from "@/hooks/usePageTitle";

// #592 — protocol escape hatch recovery.
export default function EscapePage() {
  usePageTitle("Emergency withdrawal");
  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <EscapeWithdrawPage />
    </main>
  );
}
