"use client";

import type { PaymentStage } from "@/lib/api/paymentInstructions";

const STAGES: { key: PaymentStage; label: string }[] = [
  { key: "received", label: "Payment received" },
  { key: "matched", label: "Payment matched" },
  { key: "settled", label: "Invoice settled" },
];

export function PaymentStatusTracker({ stages }: { stages: Record<PaymentStage, boolean> }) {
  return (
    <ol className="space-y-2" data-testid="payment-status-tracker">
      {STAGES.map(({ key, label }) => (
        <li key={key} className="flex items-center gap-2 text-sm" data-testid={`payment-stage-${key}`}>
          <span
            className={`size-2 rounded-full ${stages[key] ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
            aria-hidden="true"
          />
          <span className={stages[key] ? "font-medium" : "text-muted-foreground"}>{label}</span>
          <span className="ml-auto text-xs text-muted-foreground">
            {stages[key] ? "Complete" : "Pending"}
          </span>
        </li>
      ))}
    </ol>
  );
}
