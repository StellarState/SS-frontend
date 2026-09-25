"use client";

import { useState } from "react";
import { Flame, MoreHorizontal, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { KeyTransferModal } from "@/components/dashboard/KeyTransferModal";
import { BurnKeyModal } from "@/components/keys/BurnKeyModal";
import type { InvestmentPosition } from "@/lib/portfolio";

interface HoldingActionsMenuProps {
  position: InvestmentPosition;
}

/** Action menu for a portfolio holding row — hosts the transfer and burn flows. */
export function HoldingActionsMenu({ position }: HoldingActionsMenuProps) {
  const [transferOpen, setTransferOpen] = useState(false);
  const [burnOpen, setBurnOpen] = useState(false);

  const keyId = position.key_id ?? position.invoice_id;
  const heldBalance = position.quantity ?? 0;
  const hasBalance = heldBalance > 0;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            // Several of these render on one page, so a generic "Holding
            // actions" gave a screen reader user no way to tell them apart.
            aria-label={`Holding actions for ${position.key_title ?? position.invoice_title}`}
            aria-haspopup="menu"
            data-testid={`holding-actions-${keyId}`}
          >
            <MoreHorizontal aria-hidden="true" className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem
            disabled={!hasBalance}
            onSelect={() => setTransferOpen(true)}
            data-testid={`transfer-action-${keyId}`}
          >
            <Send aria-hidden="true" className="h-4 w-4" />
            Transfer
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!hasBalance}
            onSelect={() => setBurnOpen(true)}
            data-testid={`burn-action-${keyId}`}
          >
            <Flame aria-hidden="true" className="h-4 w-4" />
            Burn
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <KeyTransferModal
        position={position}
        open={transferOpen}
        onOpenChange={setTransferOpen}
      />
      <BurnKeyModal
        position={position}
        open={burnOpen}
        onOpenChange={setBurnOpen}
      />
    </>
  );
}
