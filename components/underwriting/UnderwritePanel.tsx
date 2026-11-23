"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { CoverMeter } from "@/components/underwriting/CoverMeter";
import { useWallet } from "@/context/WalletContext";
import {
  useInvoiceCover,
  useReleaseStakeMutation,
  useStakeCoverMutation,
} from "@/hooks/useUnderwriting";
import { canReleaseStake, projectedPremium, stakeAmountError } from "@/lib/underwriting";
import type { Invoice } from "@/lib/api";

interface UnderwritePanelProps {
  invoiceId: string;
  invoiceStatus: Invoice["status"];
}

/**
 * Underwriter staking on the invoice detail page (#587): stake cover for a
 * premium, see how much cover the invoice already has, and release the stake
 * once the invoice settles.
 */
export function UnderwritePanel({ invoiceId, invoiceStatus }: UnderwritePanelProps) {
  const { address, isConnected } = useWallet();
  const { data: cover, isLoading, isError } = useInvoiceCover(invoiceId, address);
  const stake = useStakeCoverMutation(invoiceId);
  const release = useReleaseStakeMutation(invoiceId);
  const [amount, setAmount] = useState("");

  if (isLoading) {
    return <Skeleton className="h-40 w-full" data-testid="underwrite-loading" />;
  }
  // Invoices without an underwriting pool simply have no panel.
  if (isError || !cover || cover.max_cover <= 0) return null;

  const stakingOpen = invoiceStatus === "open" || invoiceStatus === "funded";
  const error = stakeAmountError(amount, cover.remaining_capacity);
  const parsed = Number(amount);
  const premium = error ? 0 : projectedPremium(parsed, cover.premium_rate);
  const canSubmit =
    Boolean(address) && stakingOpen && amount.trim() !== "" && !error && !stake.isPending;
  const releasable = canReleaseStake(invoiceStatus, cover.user_stake, cover.user_released);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit || !address) return;
    stake.mutate({ wallet: address, amount: parsed }, { onSuccess: () => setAmount("") });
  }

  return (
    <Card data-testid="underwrite-panel">
      <CardHeader>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <ShieldCheck className="h-5 w-5" />
          Underwriting
        </h2>
        <p className="text-sm text-muted-foreground">
          Stake XLM as first-loss cover for this invoice and earn a premium. If the
          invoice defaults, staked cover absorbs losses before investors.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <CoverMeter
          staked={cover.staked}
          maxCover={cover.max_cover}
          lossAbsorbed={cover.loss_absorbed}
        />

        {stakingOpen && (
          <form onSubmit={handleSubmit} className="space-y-3" data-testid="underwrite-form">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="underwrite-amount">Stake amount (XLM)</Label>
                <Input
                  id="underwrite-amount"
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "underwrite-amount-error" : undefined}
                  disabled={!isConnected || cover.remaining_capacity <= 0}
                  data-testid="underwrite-amount"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="underwrite-rate">Premium rate</Label>
                <Input
                  id="underwrite-rate"
                  readOnly
                  value={`${cover.premium_rate}%`}
                  data-testid="underwrite-rate"
                />
              </div>
            </div>
            {error && (
              <p
                id="underwrite-amount-error"
                role="alert"
                className="text-sm text-destructive"
                data-testid="underwrite-capacity-error"
              >
                {error}
              </p>
            )}
            <div className="flex items-center justify-between rounded-md bg-muted/50 p-3 text-sm">
              <span className="text-muted-foreground">Projected premium earned</span>
              <span className="font-semibold" data-testid="underwrite-projected-premium">
                {premium.toLocaleString(undefined, { maximumFractionDigits: 7 })} XLM
              </span>
            </div>
            {!isConnected ? (
              <p className="text-sm text-muted-foreground">Connect a wallet to underwrite.</p>
            ) : (
              <Button type="submit" disabled={!canSubmit} data-testid="underwrite-submit">
                {stake.isPending ? "Staking…" : "Stake cover"}
              </Button>
            )}
          </form>
        )}

        {cover.user_stake > 0 && (
          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
            data-testid="underwrite-user-stake"
          >
            <div className="text-sm">
              <p className="text-muted-foreground">Your stake</p>
              <p className="font-semibold">{cover.user_stake.toLocaleString()} XLM</p>
            </div>
            <div className="text-right">
              <Button
                type="button"
                variant="outline"
                disabled={!releasable || release.isPending}
                onClick={() => address && release.mutate({ wallet: address })}
                data-testid="underwrite-release"
              >
                {release.isPending ? "Releasing…" : cover.user_released ? "Released" : "Release stake"}
              </Button>
              {!releasable && !cover.user_released && (
                <p className="mt-1 text-xs text-muted-foreground" data-testid="underwrite-release-hint">
                  Available once the invoice has settled.
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
