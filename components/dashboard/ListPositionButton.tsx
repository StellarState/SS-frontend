"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createListing } from "@/lib/listingFee";
import { fetchListingFeeConfig, computeListingFee } from "@/lib/listingFee";
import type { InvestmentPosition } from "@/lib/portfolio";
import { useLockupStatus } from "@/hooks/useLockupStatus";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ListPositionButton({ position }: { position: InvestmentPosition }) {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(String(Math.max(0, (position.quantity ?? 0) - (position.listed_quantity ?? 0))));
  const [price, setPrice] = useState("");
  const fee = useQuery({ queryKey: ["listing-fee"], queryFn: () => fetchListingFeeConfig(), enabled: open });
  const qty = Number(quantity); const ask = Number(price);
  const preview = computeListingFee(qty, ask, fee.data?.fee_bps ?? 0);
  const mutation = useMutation({ mutationFn: () => createListing({ invoiceId: position.invoice_id, quantity: qty, askPrice: ask }), onSuccess: () => setOpen(false) });
  const lockup = useLockupStatus(position.lockup_expires_at);
  const locked = lockup.locked;
  const available = Math.max(0, (position.quantity ?? 0) - (position.listed_quantity ?? 0));
  const lockedMessage = `This position cannot be listed until ${new Date(position.lockup_expires_at ?? "").toLocaleString()}.`;

  return (
    <>
      {locked ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="inline-flex"
                tabIndex={0}
                aria-label={lockedMessage}
                data-testid="list-position-lock-tooltip-trigger"
              >
                <Button size="sm" variant="outline" disabled>
                  List for resale
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>{lockedMessage}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <Button
          size="sm"
          variant="outline"
          disabled={available === 0}
          onClick={() => setOpen(true)}
          data-testid="list-position-button"
        >
          List for resale
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>List {position.invoice_title} for resale</DialogTitle>
          </DialogHeader>
          {locked ? (
            <p className="text-sm text-destructive">
              This position is locked until {new Date(position.lockup_expires_at ?? "").toLocaleString()}.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Available fractions: {available}</p>
              <div>
                <Label htmlFor="listing-quantity">Fractions</Label>
                <Input
                  id="listing-quantity"
                  type="number"
                  min={1}
                  max={available}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="listing-price">Ask price per fraction (XLM)</Label>
                <Input
                  id="listing-price"
                  type="number"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <dl className="text-sm">
                <div className="flex justify-between"><dt>Gross</dt><dd>{preview.gross.toFixed(2)} XLM</dd></div>
                <div className="flex justify-between"><dt>Platform fee</dt><dd>{preview.fee.toFixed(2)} XLM</dd></div>
                <div className="flex justify-between font-semibold"><dt>Net proceeds</dt><dd>{preview.netProceeds.toFixed(2)} XLM</dd></div>
              </dl>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={locked || qty < 1 || qty > available || ask <= 0 || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? "Submitting…" : "Confirm listing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
