"use client";

import { useState } from "react";
import { Flame, MoreHorizontal, Send, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { KeyTransferModal } from "@/components/dashboard/KeyTransferModal";
import { BurnKeyModal } from "@/components/keys/BurnKeyModal";
import { CreateListingModal } from "@/components/marketplace/CreateListingModal";
import type { InvestmentPosition } from "@/lib/portfolio";
import { ExitLiquidityPreviewModal } from "@/components/dashboard/ExitLiquidityPreviewModal";
import type { ExitLiquidityQuote } from "@/lib/exitLiquidity";

interface HoldingActionsMenuProps {
  position: InvestmentPosition;
}

/** Action menu for a portfolio holding row — hosts the transfer and burn flows. */
export function HoldingActionsMenu({ position }: HoldingActionsMenuProps) {
  const [transferOpen, setTransferOpen] = useState(false);
  const [burnOpen, setBurnOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [exitPreviewOpen, setExitPreviewOpen] = useState(false);
  const [exitQuote, setExitQuote] = useState<ExitLiquidityQuote | null>(null);

  const keyId = position.key_id ?? position.invoice_id;
  const heldBalance = position.quantity ?? 0;
  const hasBalance = heldBalance > 0;
  const listableQuantity = Math.max(0, heldBalance - (position.listed_quantity ?? 0));

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Holding actions"
            data-testid={`holding-actions-${keyId}`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem
            disabled={!hasBalance}
            onSelect={() => setTransferOpen(true)}
            data-testid={`transfer-action-${keyId}`}
          >
            <Send className="h-4 w-4" />
            Transfer
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={listableQuantity <= 0}
            onSelect={() => setListOpen(true)}
            data-testid={`list-action-${keyId}`}
          >
            <Tag className="h-4 w-4" />
            List for sale
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!hasBalance}
            onSelect={() => setBurnOpen(true)}
            data-testid={`burn-action-${keyId}`}
          >
            <Flame className="h-4 w-4" />
            Burn
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={listableQuantity <= 0}
            onSelect={() => setExitPreviewOpen(true)}
            data-testid={`exit-liquidity-action-${keyId}`}
          >
            Exit liquidity preview
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <KeyTransferModal
        position={position}
        open={transferOpen}
        onOpenChange={setTransferOpen}
      />
      {listOpen && (
        <CreateListingModal
          invoiceId={position.invoice_id}
          invoiceName={position.invoice_title}
          availableQuantity={listableQuantity}
          open={listOpen}
          initialQuantity={exitQuote?.quantity}
          initialPrice={exitQuote?.limitPrice}
          quoteExpiresAt={exitQuote?.expiresAt}
          onOpenChange={(next) => {
            setListOpen(next);
            if (!next) setExitQuote(null);
          }}
        />
      )}
      {exitPreviewOpen && (
        <ExitLiquidityPreviewModal
          position={{ ...position, quantity: listableQuantity }}
          open={exitPreviewOpen}
          onOpenChange={setExitPreviewOpen}
          onContinueToListing={(quote) => {
            setExitQuote(quote);
            setExitPreviewOpen(false);
            setListOpen(true);
          }}
        />
      )}
      <BurnKeyModal
        position={position}
        open={burnOpen}
        onOpenChange={setBurnOpen}
      />
    </>
  );
}
