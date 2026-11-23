"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import { HoldingActionsMenu } from "@/components/dashboard/HoldingActionsMenu";
import { TopUpModal } from "@/components/invoices/TopUpModal";
import { KeyTransferModal } from "@/components/dashboard/KeyTransferModal";
import { PositionTransferModal } from "@/components/dashboard/PositionTransferModal";
import { BurnKeyModal } from "@/components/keys/BurnKeyModal";
import type { InvestmentPosition } from "@/lib/portfolio";
import { Money } from "@/components/currency";
import { OverdueChip } from "@/components/invoices/OverdueChip";
import { InvestorLateInterest } from "@/components/invoices/InvestorLateInterest";
import { AccrualMeter } from "@/components/investor/AccrualMeter";
import { LockupIndicator } from "@/components/dashboard/LockupIndicator";

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
  const isKeyHolding = Boolean(position.key_id);
  const hasTransferableBalance = isKeyHolding && (position.quantity ?? 0) > 0;
  const canTopUp = position.status === "active" && (position.remaining_capacity ?? 0) > 0;
  const isDefaulted = position.status === "defaulted";

  return (
    <Card data-testid="position-card">
      <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {isDefaulted ? (
            <Link
              href={`/marketplace/${position.invoice_id}`}
              className="font-semibold hover:underline"
              data-testid="defaulted-position-link"
            >
              {position.invoice_title}
            </Link>
          ) : (
            <p className="font-semibold">{position.invoice_title}</p>
          )}
          <p className="text-sm text-muted-foreground">
            <span data-testid="position-committed">
              <Money
                xlm={position.committed_amount}
                xlmText={`${formatCommittedXlm(position.committed_amount)} XLM`}
              />{" "}
              committed
            </span>
            {" · "}
            <span data-testid="position-share">{shareDisplay}</span>
            {shareDisplay !== "—" ? " share" : null}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <OverdueChip status={position.status} dueDate={position.due_date} />
            <LockupIndicator expiresAt={position.lockup_expires_at} />
            {position.status === "active" && typeof position.share_percent === "number" && (
              <InvestorLateInterest
                invoiceId={position.invoice_id}
                sharePercent={position.share_percent}
              />
            )}
          </div>
          {position.status === "active" && (
            <div className="mt-3">
              <AccrualMeter invoiceId={position.invoice_id} />
            </div>
          )}
          {isDefaulted && (
            <Link
              href={`/marketplace/${position.invoice_id}`}
              className="mt-1 inline-block text-xs text-red-600 underline hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
              data-testid="view-default-resolution"
            >
              View default resolution →
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isKeyHolding && <HoldingActionsMenu position={position} />}
          {canTopUp && (
            <TopUpModal
              invoiceId={position.invoice_id}
              currentCommittedAmount={position.committed_amount}
              remainingCapacity={position.remaining_capacity ?? 0}
            />
          )}
          {position.status === "active" && (
            <PositionTransferModal position={position} />
          )}
          {hasTransferableBalance && <KeyTransferModal position={position} />}
          {hasTransferableBalance && <BurnKeyModal position={position} />}
          <InvoiceStatusBadge status={position.status} />
        </div>
      </CardContent>
    </Card>
  );
}
