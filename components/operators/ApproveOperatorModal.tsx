"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PayoutOperator } from "@/lib/api";
import {
  expiryDateToIso,
  OPERATOR_EXPLANATION,
  operatorAddressError,
  operatorExpiryError,
} from "@/lib/operators";

interface ApproveOperatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investor: string | null;
  existing: PayoutOperator[];
  isSubmitting?: boolean;
  onApprove: (input: { operator: string; expiresAt: string }) => Promise<unknown> | void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Approve a custodian to claim payouts on the investor's behalf (#591). */
export function ApproveOperatorModal({
  open,
  onOpenChange,
  investor,
  existing,
  isSubmitting = false,
  onApprove,
}: ApproveOperatorModalProps) {
  const [address, setAddress] = useState("");
  const [expiry, setExpiry] = useState("");
  const [touched, setTouched] = useState({ address: false, expiry: false });

  const addressError = operatorAddressError(address, investor, existing);
  const expiryError = operatorExpiryError(expiry);
  const showAddressError = touched.address && addressError;
  const showExpiryError = touched.expiry && expiryError;

  function reset() {
    setAddress("");
    setExpiry("");
    setTouched({ address: false, expiry: false });
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setTouched({ address: true, expiry: true });
    if (addressError || expiryError) return;
    const expiresAt = expiryDateToIso(expiry)!;
    try {
      await onApprove({ operator: address.trim(), expiresAt });
      handleOpenChange(false);
    } catch {
      // The hook surfaces the error as a toast; keep the form for a retry.
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent data-testid="approve-operator-modal">
        <form onSubmit={handleSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Approve operator</DialogTitle>
            <DialogDescription>
              Let a custodian claim payouts for you without sharing your keys.
            </DialogDescription>
          </DialogHeader>

          <div
            className="flex items-start gap-2 rounded-md border bg-muted/50 p-3 text-sm"
            data-testid="operator-explanation"
          >
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p>{OPERATOR_EXPLANATION}</p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="operator-address">Operator address</Label>
            <Input
              id="operator-address"
              placeholder="G…"
              autoComplete="off"
              spellCheck={false}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, address: true }))}
              aria-invalid={Boolean(showAddressError)}
              aria-describedby={showAddressError ? "operator-address-error" : undefined}
              className="font-mono"
              data-testid="operator-address-input"
            />
            {showAddressError && (
              <p id="operator-address-error" role="alert" className="text-sm text-destructive" data-testid="operator-address-error">
                {addressError}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="operator-expiry">Expires on</Label>
            <Input
              id="operator-expiry"
              type="date"
              min={todayIso()}
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, expiry: true }))}
              aria-invalid={Boolean(showExpiryError)}
              aria-describedby={showExpiryError ? "operator-expiry-error" : undefined}
              data-testid="operator-expiry-input"
            />
            {showExpiryError && (
              <p id="operator-expiry-error" role="alert" className="text-sm text-destructive" data-testid="operator-expiry-error">
                {expiryError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} data-testid="approve-operator-submit">
              {isSubmitting ? "Approving…" : "Approve operator"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
