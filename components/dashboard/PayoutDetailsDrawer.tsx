"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useWithholding } from "@/hooks/useWithholding";
import type { PayoutRecord } from "@/lib/api";
import { withholdingForPayout, formatStellarAmount } from "@/lib/withholding";

/** Withholding section plus payout identity. The section is hidden at zero rate. */
export function PayoutDetailsDrawer({
  payout,
  open,
  onOpenChange,
}: {
  payout: PayoutRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: settings } = useWithholding();
  const breakdown = payout ? withholdingForPayout(payout, settings) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent data-testid="payout-details-drawer">
        <SheetHeader>
          <SheetTitle>Payout details</SheetTitle>
          <SheetDescription>{payout?.invoiceId ?? ""}</SheetDescription>
        </SheetHeader>
        {payout && (
          <div className="mt-6 space-y-4 text-sm">
            <div className="flex justify-between">
              <span>Seller</span>
              <span>{payout.sellerName}</span>
            </div>
            {settings && (
              <div className="rounded-md border p-3" data-testid="withholding-settings-summary">
                <p className="font-medium">Withholding settings</p>
                <p className="text-muted-foreground">
                  Rate: {settings.ratePercentage.toFixed(2)}% · Recipient: {settings.recipientLabel}
                </p>
              </div>
            )}
            {breakdown && (
              <section className="space-y-2 rounded-md border p-3" data-testid="withholding-breakdown">
                <h4 className="font-medium">Withholding breakdown</h4>
                <div className="flex justify-between"><span>Principal</span><span data-testid="withholding-principal">{formatStellarAmount(breakdown.principal)}</span></div>
                <div className="flex justify-between"><span>Gross yield</span><span data-testid="withholding-gross-yield">{formatStellarAmount(breakdown.grossYield)}</span></div>
                <div className="flex justify-between"><span>Rate</span><span>{breakdown.ratePercentage.toFixed(2)}%</span></div>
                <div className="flex justify-between"><span>Withheld</span><span data-testid="withholding-withheld">{formatStellarAmount(breakdown.withheld)}</span></div>
                <div className="flex justify-between font-semibold"><span>Net payout</span><span data-testid="withholding-net">{formatStellarAmount(breakdown.net)}</span></div>
                <p className="text-xs text-muted-foreground">Principal is never withheld.</p>
              </section>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
