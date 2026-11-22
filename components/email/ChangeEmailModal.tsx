"use client";

/** Change-email dialog with re-authentication (issue #653). */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isValidEmail } from "@/lib/emailVerification";

interface ChangeEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEmail: string;
  cooldownSeconds?: number;
  isChanging?: boolean;
  /** Injected for tests. Sends verification to the new address. */
  onChangeEmail?: (email: string, password: string) => Promise<void>;
}

export function ChangeEmailModal({
  open,
  onOpenChange,
  currentEmail,
  cooldownSeconds = 0,
  isChanging = false,
  onChangeEmail,
}: ChangeEmailModalProps) {
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setNewEmail("");
      setPassword("");
      setError(null);
      setSentTo(null);
    }
  }, [open]);

  const emailValid = isValidEmail(newEmail);
  const canSubmit = emailValid && password.length > 0 && !isChanging && cooldownSeconds === 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);
    try {
      await onChangeEmail?.(newEmail.trim(), password);
      setSentTo(newEmail.trim());
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change email. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="change-email-modal">
        <DialogHeader>
          <DialogTitle>Change email address</DialogTitle>
          <DialogDescription>
            Confirm your password to request a change. Your current address, {currentEmail},
            stays active until the new one is verified.
          </DialogDescription>
        </DialogHeader>

        {sentTo ? (
          <div className="space-y-2 text-sm" role="status" data-testid="change-email-sent">
            <p>We sent a verification link to {sentTo}.</p>
            <p className="text-muted-foreground">
              Your current address remains active until you follow that link.
            </p>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={(event) => void handleSubmit(event)} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="new-email">New email address</Label>
              <Input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
                data-testid="new-email-input"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="change-email-password">Confirm password</Label>
              <Input
                id="change-email-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                data-testid="change-email-password"
              />
              <p className="text-xs text-muted-foreground">
                We ask for your password again to protect this change.
              </p>
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive" data-testid="change-email-error">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit} data-testid="change-email-submit">
                {isChanging ? "Sending..." : "Send verification"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
