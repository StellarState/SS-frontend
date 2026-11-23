"use client";

import { useState } from "react";
import { Loader2, ShieldCheck, X } from "lucide-react";
import { StrKey } from "stellar-sdk";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  validateDelegation,
  type DelegationScope,
  type GovernanceDelegation,
} from "@/lib/governanceDelegation";

interface GovernanceDelegationModalProps {
  keyId: string;
  userAddress: string;
  availableKeys: number;
  whitelistEnabled?: boolean;
  whitelistedAddresses?: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelegationCreated: (delegation: GovernanceDelegation) => void;
}

export function GovernanceDelegationModal({
  keyId,
  userAddress,
  availableKeys,
  whitelistEnabled = false,
  whitelistedAddresses = [],
  open,
  onOpenChange,
  onDelegationCreated,
}: GovernanceDelegationModalProps) {
  const [delegateAddress, setDelegateAddress] = useState("");
  const [scope, setScope] = useState<DelegationScope>("all");
  const [weight, setWeight] = useState(String(availableKeys > 0 ? availableKeys : 1));
  const [durationDays, setDurationDays] = useState("30");
  const [customExpiry, setCustomExpiry] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  const numWeight = parseFloat(weight) || 0;
  const expiryTimestamp = customExpiry
    ? new Date(customExpiry).toISOString()
    : new Date(Date.now() + parseInt(durationDays, 10) * 86_400_000).toISOString();

  const handleCreate = async () => {
    setError(null);
    const validation = validateDelegation({
      keyId,
      delegatorAddress: userAddress,
      delegateAddress,
      scope,
      votingWeight: numWeight,
      availableKeys,
      expiresAt: expiryTimestamp,
      whitelistEnabled,
      whitelistedAddresses,
    });

    if (!validation.valid) {
      setError(validation.error || "Invalid delegation input");
      return;
    }

    setIsSubmitting(true);
    try {
      const newDelegation: GovernanceDelegation = {
        id: `del-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        keyId,
        delegatorAddress: userAddress,
        delegateAddress: delegateAddress.trim(),
        scope,
        votingWeight: numWeight,
        createdAt: new Date().toISOString(),
        expiresAt: expiryTimestamp,
        status: "active",
      };

      onDelegationCreated(newDelegation);
      onOpenChange(false);
      setDelegateAddress("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create delegation");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      data-testid="governance-delegation-modal"
    >
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
                <ShieldCheck className="h-4 w-4" />
                Custody-Safe Voting Delegation
              </p>
              <h2 className="text-xl font-semibold">Delegate Creator Key Votes</h2>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              aria-label="Close delegation modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">
            Delegating voting power <strong>never transfers key custody</strong>. Your creator
            keys remain 100% in your wallet and you can revoke delegation at any moment.
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="delegate-address">Delegate Stellar Address</Label>
            <Input
              id="delegate-address"
              placeholder="G..."
              value={delegateAddress}
              onChange={(e) => {
                setDelegateAddress(e.target.value);
                setError(null);
              }}
              data-testid="input-delegate-address"
            />
            {delegateAddress && !StrKey.isValidEd25519PublicKey(delegateAddress.trim()) && (
              <p className="text-xs text-destructive">Invalid Stellar Ed25519 public address</p>
            )}
            {whitelistEnabled && (
              <p className="text-xs text-muted-foreground">
                Whitelist enforcement active: Delegate must be approved on key whitelist.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="delegated-weight">Voting Weight (Keys)</Label>
              <Input
                id="delegated-weight"
                type="number"
                min="1"
                max={availableKeys}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                data-testid="input-delegated-weight"
              />
              <p className="text-xs text-muted-foreground">Max available: {availableKeys}</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="delegation-scope">Delegation Scope</Label>
              <Select
                value={scope}
                onValueChange={(val) => setScope(val as DelegationScope)}
              >
                <SelectTrigger id="delegation-scope" data-testid="select-delegation-scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Proposals</SelectItem>
                  <SelectItem value="parameter_only">Parameter Proposals Only</SelectItem>
                  <SelectItem value="emergency_only">Emergency Actions Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="delegation-duration">Expiry Duration</Label>
            <Select
              value={durationDays}
              onValueChange={(val) => {
                setDurationDays(val);
                setCustomExpiry("");
              }}
            >
              <SelectTrigger id="delegation-duration" data-testid="select-delegation-duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 Days</SelectItem>
                <SelectItem value="14">14 Days</SelectItem>
                <SelectItem value="30">30 Days</SelectItem>
                <SelectItem value="90">90 Days</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Expires automatically on: {new Date(expiryTimestamp).toLocaleDateString()}
            </p>
          </div>

          {error && (
            <div
              className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
              data-testid="delegation-error-message"
            >
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreate}
              disabled={isSubmitting || !delegateAddress.trim() || numWeight <= 0}
              data-testid="confirm-delegation-button"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Confirming...
                </>
              ) : (
                "Confirm Delegation"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
