"use client";

import { OperatorsPage } from "@/components/operators/OperatorsPage";
import { usePageTitle } from "@/hooks/usePageTitle";

// #591 — delegated payout operators.
export default function SettingsOperatorsPage() {
  usePageTitle("Operators");
  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <OperatorsPage />
    </main>
  );
}
