"use client";

import { useMemo, useState } from "react";
import { Loader2, Send, X } from "lucide-react";
import { StrKey } from "stellar-sdk";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { InvestmentPosition } from "@/lib/portfolio";
import { useAuth } from "@/hooks/useAuth";
import { useTransferCreatorKeyMutation } from "@/hooks/useCreatorKeys";
import { useStellarWallet } from "@/hooks/useStellarWallet";
import { useDialogFocus } from "@/hooks/useDialogFocus";

interface KeyTransferModalProps {
  position: InvestmentPosition;
  /** When provided the modal is controlled and renders no trigger button of its own. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function isLockupActive(lockupExpiresAt?: string | null): boolean {
  if (!lockupExpiresAt) return false;
  return new Date(lockupExpiresAt).getTime() > Date.now();
}

export function KeyTransferModal({
  position,
  open: controlledOpen,
  onOpenChange,
}: KeyTransferModalProps) {
  const { address: authAddress, jwt } = useAuth();
  const { address: walletAddress } = useStellarWallet();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = (next: boolean) => {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  const [recipient, setRecipient] = useState("");
  const [quantity, setQuantity] = useState("1");
  const transferMutation = useTransferCreatorKeyMutation();

  const heldBalance = position.quantity ?? position.committed_amount;
  const keyId = position.key_id ?? position.invoice_id;
  const title = position.key_title ?? position.invoice_title;
  const parsedQuantity = Number(quantity);
  const lockupActive = isLockupActive(position.lockup_expires_at);
  const senderAddress = authAddress ?? walletAddress;

  const validationError = useMemo(() => {
    const trimmedRecipient = recipient.trim();

    if (!trimmedRecipient) return null;
    if (!StrKey.isValidEd25519PublicKey(trimmedRecipient)) {
      return "Invalid Stellar address";
    }
    if (senderAddress && trimmedRecipient === senderAddress) {
      return "Cannot transfer to yourself";
    }
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      return "Enter a valid quantity";
    }
    if (parsedQuantity > heldBalance) {
      return "Insufficient balance";
    }

    return null;
  }, [heldBalance, parsedQuantity, recipient, senderAddress]);

  const canSubmit =
    Boolean(senderAddress) &&
    recipient.trim().length > 0 &&
    !validationError &&
    !transferMutation.isPending;

  const reset = () => {
    setRecipient("");
    setQuantity("1");
  };

  // Escape and Tab-cycling both close the dialog, matching the close button.
  const dialogRef = useDialogFocus(open, () => {
    setOpen(false);
    reset();
  });

  const handleSubmit = async () => {
    if (!senderAddress || validationError) return;

    await transferMutation.mutateAsync({
      keyId,
      recipient: recipient.trim(),
      quantity: parsedQuantity,
      walletAddress: senderAddress,
      token: jwt,
    });
    setOpen(false);
    reset();
  };

  return (
    <>
      {!isControlled && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          data-testid={`transfer-button-${keyId}`}
        >
          <Send className="h-4 w-4" />
          Transfer
        </Button>
      )}

      {open && (
        <div
          ref={dialogRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          // -1 only, so the container itself is not a tab stop; it exists as
          // a focus target for the trap's "nothing else to focus" fallback.
          tabIndex={-1}
          aria-labelledby={`transfer-key-title-${keyId}`}
        >
          <Card className="w-full max-w-lg">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Transfer Key
                  </p>
                  <h2 id={`transfer-key-title-${keyId}`} className="text-xl font-semibold">{title}</h2>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setOpen(false);
                    reset();
                  }}
                  aria-label="Close transfer modal"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {lockupActive && (
                <div role="status" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  Transfers may be blocked until your lockup expires on{" "}
                  {new Date(position.lockup_expires_at ?? "").toLocaleString()}.
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor={`recipient-${keyId}`} className="text-sm font-medium">
                  Recipient wallet address
                </label>
                <Input
                  id={`recipient-${keyId}`}
                  value={recipient}
                  onChange={(event) => setRecipient(event.target.value)}
                  placeholder="G..."
                  aria-invalid={Boolean(validationError)}
                  aria-describedby={validationError ? "key-transfer-error" : undefined}
                  data-autofocus
                />
              </div>

              <div className="space-y-2">
                <label htmlFor={`quantity-${keyId}`} className="text-sm font-medium">
                  Quantity
                </label>
                <Input
                  id={`quantity-${keyId}`}
                  type="number"
                  min="1"
                  max={heldBalance}
                  step="1"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  aria-invalid={Boolean(validationError)}
                  aria-describedby={
                    validationError
                      ? "key-transfer-error key-transfer-balance"
                      : "key-transfer-balance"
                  }
                />
                <p id="key-transfer-balance" className="text-xs text-muted-foreground">
                  Available balance: {heldBalance.toLocaleString()}
                </p>
              </div>

              {validationError && (
                <p
                  id="key-transfer-error"
                  role="alert"
                  className="text-sm font-medium text-destructive"
                >
                  {validationError}
                </p>
              )}

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    reset();
                  }}
                  disabled={transferMutation.isPending}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
                  {transferMutation.isPending && (
                    <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                  )}
                  {transferMutation.isPending ? "Signing..." : "Confirm Transfer"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
