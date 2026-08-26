"use client";

import { Card, CardContent } from "@/components/ui/card";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import type { InvestmentPosition } from "@/lib/portfolio";

function formatCommittedXlm(amount: number): string {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Rounds to two decimal places; whole numbers render without trailing zeros (e.g. 100%). */
export function formatSharePercent(share: number | null | undefined): string {
  if (typeof share !== "number" || Number.isNaN(share)) {
    return "—";
  }
  return `${Number(share.toFixed(2))}%`;
}

interface PositionCardProps {
  position: InvestmentPosition;
}

export function PositionCard({ position }: PositionCardProps) {
  const shareDisplay = formatSharePercent(position.share_percent);

  return (
    <Card data-testid="position-card">
      <CardContent className="flex items-center justify-between pt-6">
        <div>
          <p className="font-semibold">{position.invoice_title}</p>
          <p className="text-sm text-muted-foreground">
            <span data-testid="position-committed">
              {formatCommittedXlm(position.committed_amount)} XLM committed
            </span>
            {" · "}
            <span data-testid="position-share">{shareDisplay}</span>
            {shareDisplay !== "—" ? " share" : null}
          </p>
        </div>
        <InvoiceStatusBadge status={position.status} />
      </CardContent>
    </Card>
  );
}
