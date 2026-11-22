"use client";

import React, { useState } from "react";
import { X, ShieldCheck, AlertCircle, Clock, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DelegationScope } from "@/lib/governance/delegations";

export interface DelegationModalProps {
  keyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maxAvailablePower: number;
  whitelistEnabled?: boolean;
  whitelistedAddresses?: string[];
  onDelegate: (params: {
    delegateAddress: string;
    votingPower: number;
    scope: DelegationScope;
    expiresInDays: number;
  }) => { success: boolean; error?: string };
}

export function DelegationModal({
  keyId,
  open,
  onOpenChange,
  maxAvailablePower,
  whitelistEnabled = false,
  whitelistedAddresses = [],
  onDelegate,
}: DelegationModalProps) {
  const [delegateAddress, setDelegateAddress] = useState("");
  const [votingPower, setVotingPower] = useState(
    maxAvailablePower > 0 ? String(Math.min(10, maxAvailablePower)) : "1"
  );
  const [scope, setScope] = useState<DelegationScope>("all_proposals");
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!open) return null;

  const parsedPower = Number(votingPower);
  const isValidPower =
    Number.isInteger(parsedPower) &&
    parsedPower > 0 &&
    parsedPower <= maxAvailablePower;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isValidPower) {
      setErrorMessage(`Voting power must be between 1 and ${maxAvailablePower}`);
      return;
    }

    const result = onDelegate({
      delegateAddress: delegateAddress.trim(),
      votingPower: parsedPower,
      scope,
      expiresInDays,
    });

    if (result.success) {
      onOpenChange(false);
      setDelegateAddress("");
    } else {
      setErrorMessage(result.error || "Delegation failed");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      data-testid="delegation-modal"
    >
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">Delegate Voting Power</h2>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Grant temporary governance voting rights to a trusted steward or DAO representative.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              aria-label="Close delegation modal"
              className="h-8 w-8"
              data-testid="btn-close-delegation-modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-4 text-xs">
            {/* Custody Guarantee Badge */}
            <Alert className="bg-primary/5 border-primary/20" data-testid="custody-guarantee-alert">
              <Lock className="h-4 w-4 text-primary" />
              <AlertTitle className="text-xs font-semibold text-primary">
                Custody Intact (Zero Asset Transfer)
              </AlertTitle>
              <AlertDescription className="text-[11px] text-muted-foreground mt-0.5">
                Creator keys remain 100% in your custody and wallet. You can revoke delegation at any moment to restore direct voting power immediately.
              </AlertDescription>
            </Alert>

            {/* Whitelist Constraint Badge */}
            {whitelistEnabled && (
              <div
                className="flex items-center justify-between p-2.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300"
                data-testid="whitelist-restriction-notice"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-semibold text-[11px]">
                    Whitelist Constraint Enforced
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] border-amber-500 font-mono">
                  {whitelistedAddresses.length} Approved Stewards
                </Badge>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <Alert variant="destructive" data-testid="delegation-error-alert">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
              </Alert>
            )}

            {/* Delegate Address */}
            <div className="space-y-1.5">
              <label htmlFor="delegate-address-input" className="font-medium text-foreground">
                Delegate Stellar Wallet Address
              </label>
              <Input
                id="delegate-address-input"
                placeholder="G..."
                value={delegateAddress}
                onChange={(e) => setDelegateAddress(e.target.value)}
                className="font-mono text-xs h-9"
                data-testid="input-delegate-address"
                required
              />
            </div>

            {/* Voting Power to Delegate */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label htmlFor="delegated-power-input" className="font-medium text-foreground">
                  Voting Power (Keys)
                </label>
                <span className="text-[11px] text-muted-foreground">
                  Available: <strong className="font-mono text-foreground">{maxAvailablePower}</strong> keys
                </span>
              </div>
              <Input
                id="delegated-power-input"
                type="number"
                min="1"
                max={maxAvailablePower}
                value={votingPower}
                onChange={(e) => setVotingPower(e.target.value)}
                className="font-mono text-xs h-9"
                data-testid="input-delegated-power"
                required
              />
            </div>

            {/* Expiry Duration */}
            <div className="space-y-1.5">
              <label className="font-medium text-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Delegation Expiration Period
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[7, 30, 90, 365].map((days) => (
                  <Button
                    key={days}
                    type="button"
                    variant={expiresInDays === days ? "secondary" : "outline"}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setExpiresInDays(days)}
                    data-testid={`btn-expiry-${days}`}
                  >
                    {days} Days
                  </Button>
                ))}
              </div>
            </div>

            {/* Delegation Scope */}
            <div className="space-y-1.5">
              <label className="font-medium text-foreground">Delegation Scope</label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={scope === "all_proposals" ? "secondary" : "outline"}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setScope("all_proposals")}
                  data-testid="btn-scope-all"
                >
                  All Proposals
                </Button>
                <Button
                  type="button"
                  variant={scope === "specific_proposal" ? "secondary" : "outline"}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setScope("specific_proposal")}
                  data-testid="btn-scope-specific"
                >
                  Specific Proposal
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 text-xs"
                onClick={() => onOpenChange(false)}
                data-testid="btn-cancel-delegation"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                size="sm"
                className="h-9 text-xs"
                disabled={!isValidPower || !delegateAddress.trim()}
                data-testid="btn-submit-delegation"
              >
                Confirm Delegation
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
