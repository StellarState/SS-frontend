"use client";

import { useState } from "react";
import { Award, Calendar, CheckCircle2, Gift, History, PartyPopper, RefreshCw, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useInvestorLoyalty } from "@/hooks/useInvestorLoyalty";
import { useWallet } from "@/context/WalletContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  LOYALTY_TIER_LABELS,
  TIER_RETENTION_DAYS,
  getLoyaltyProgress,
  isRecentlyPromoted,
  reconcileRewardLedger,
  redeemReward,
  type LoyaltyRewardLedgerEntry,
  type ServerLoyaltySnapshot,
  evaluateLoyaltyWithSnapshot,
} from "@/lib/loyalty";

const MOCK_LEDGER_ENTRIES: LoyaltyRewardLedgerEntry[] = [
  {
    id: "rw-1",
    date: "2026-10-15T10:00:00Z",
    type: "earned",
    amount: 150,
    description: "Yield boost multiplier on Invoice #INV-882",
    category: "yield_boost",
    status: "cleared",
  },
  {
    id: "rw-2",
    date: "2026-10-28T14:30:00Z",
    type: "earned",
    amount: 50,
    description: "Silver tier fee discount rebate",
    category: "fee_discount",
    status: "cleared",
  },
  {
    id: "rw-3",
    date: "2026-11-05T09:15:00Z",
    type: "redeemed",
    amount: 100,
    description: "Redemption to Stellar USDC wallet",
    category: "cashback",
    status: "cleared",
  },
];

export function LoyaltyTierPage() {
  usePageTitle("Loyalty tier");
  const { address, isConnected } = useWallet();
  const { data: initialLoyalty, isLoading, isError } = useInvestorLoyalty(address);

  const [retentionDays] = useState(45); // Active investor retention
  const [redeemAmount, setRedeemAmount] = useState("");
  const [ledger, setLedger] = useState(() => reconcileRewardLedger(MOCK_LEDGER_ENTRIES));
  const [redemptionError, setRedemptionError] = useState<string | null>(null);
  const [redemptionSuccess, setRedemptionSuccess] = useState<string | null>(null);

  // Server snapshot evaluation state
  const [customSnapshot, setCustomSnapshot] = useState<ServerLoyaltySnapshot | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  const evaluatedSnapshot = customSnapshot ?? {
    snapshotId: "SNAP-20261120-X89",
    wallet: address || "GINV",
    evaluatedAt: "2026-11-20T00:00:00Z",
    effectiveDate: "2026-11-20",
    cumulativeVolume: initialLoyalty?.cumulative_volume ?? 30000,
    retentionDays: initialLoyalty?.tier === "platinum" ? 200 : initialLoyalty?.tier === "gold" ? 100 : initialLoyalty?.tier === "silver" ? 45 : 10,
    calculatedTier: initialLoyalty?.tier ?? "bronze",
  };

  if (!isConnected) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="loyalty-connect">
        Connect a wallet to see your loyalty tier.
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="loyalty-loading">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError || !initialLoyalty) {
    return (
      <p className="text-sm text-destructive" role="alert">
        Could not load your loyalty tier. Refresh to try again.
      </p>
    );
  }

  // Evaluate with verified server snapshot
  const { updatedLoyalty: loyalty } = evaluateLoyaltyWithSnapshot(initialLoyalty, evaluatedSnapshot);

  const progress = getLoyaltyProgress(loyalty, retentionDays);
  const tierLabel = LOYALTY_TIER_LABELS[loyalty.tier];
  const showBanner = isRecentlyPromoted(loyalty.promoted_at);
  const currentTierDef = loyalty.tiers.find((t) => t.tier === loyalty.tier);

  const handleRedeem = (e: React.FormEvent) => {
    e.preventDefault();
    setRedemptionError(null);
    setRedemptionSuccess(null);

    const amt = parseFloat(redeemAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setRedemptionError("Please enter a valid amount to redeem.");
      return;
    }

    const res = redeemReward(ledger, amt, "Manual reward balance withdrawal");
    if (!res.success) {
      setRedemptionError(res.error || "Failed to redeem reward.");
    } else {
      setLedger(res.updatedSummary);
      setRedeemAmount("");
      setRedemptionSuccess(`Successfully redeemed ${amt} XLM.`);
    }
  };

  const handleTriggerServerEvaluation = () => {
    setEvaluating(true);
    setTimeout(() => {
      // Simulate server evaluation snapshot refresh
      setCustomSnapshot({
        snapshotId: `SNAP-${Date.now().toString().slice(-6)}`,
        wallet: address || "GINV",
        evaluatedAt: new Date().toISOString(),
        effectiveDate: new Date().toISOString().split("T")[0],
        cumulativeVolume: loyalty.cumulative_volume,
        retentionDays,
        calculatedTier: loyalty.tier,
      });
      setEvaluating(false);
    }, 600);
  };

  return (
    <div className="space-y-6" data-testid="loyalty-page">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Investor Loyalty Tier & Rewards</h1>
          <p className="text-muted-foreground text-sm">
            Earn volume multipliers, fee discounts, and redeemable loyalty rewards based on volume and retention.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleTriggerServerEvaluation}
          disabled={evaluating}
          data-testid="refresh-evaluation-btn"
          className="gap-2 shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${evaluating ? "animate-spin" : ""}`} />
          {evaluating ? "Evaluating..." : "Evaluate Eligibility"}
        </Button>
      </div>

      {showBanner && (
        <div
          className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-100"
          role="status"
          data-testid="tier-upgrade-banner"
        >
          <PartyPopper className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">
            You reached {tierLabel}. Your new benefits are active.
          </p>
        </div>
      )}

      {/* Snapshot Verification Badge */}
      <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground" data-testid="server-snapshot-badge">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span>
            Server Snapshot: <strong className="text-foreground">{evaluatedSnapshot?.snapshotId || "Pending"}</strong>
          </span>
          <span>•</span>
          <span>Evaluated: {evaluatedSnapshot?.evaluatedAt ? new Date(evaluatedSnapshot.evaluatedAt).toLocaleDateString() : "Pending"}</span>
        </div>
        <Badge variant="outline" className="text-[11px] font-normal">
          Eligibility Verified
        </Badge>
      </div>

      {/* Tier Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card data-testid="current-tier-card" className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardDescription>Current Tier</CardDescription>
            <div className="flex items-center justify-between">
              <CardTitle className="text-3xl font-bold capitalize" data-testid="current-tier-name">
                {tierLabel}
              </CardTitle>
              <Award className="h-8 w-8 text-primary" aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="text-muted-foreground">
              Cumulative volume:{" "}
              <span className="font-medium text-foreground" data-testid="cumulative-volume">
                {loyalty.cumulative_volume.toLocaleString()} XLM
              </span>
            </p>
            <p className="text-muted-foreground">
              Investor retention: <span className="font-medium text-foreground">{retentionDays} days</span>
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardDescription>Active Multipliers & Benefits</CardDescription>
            <CardTitle className="text-xl">
              {currentTierDef ? `${currentTierDef.fee_discount}% Fee Discount · +${currentTierDef.yield_boost}% Yield Boost` : "Standard Benefits"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {progress.nextTier ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Progress to {LOYALTY_TIER_LABELS[progress.nextTier.tier]}</span>
                  <span className="tabular-nums font-semibold" data-testid="tier-progress-percent">
                    {Math.round(progress.percent)}%
                  </span>
                </div>
                <Progress
                  value={progress.percent}
                  aria-label={`Progress to ${LOYALTY_TIER_LABELS[progress.nextTier.tier]}`}
                  data-testid="tier-progress-bar"
                />
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <p data-testid="tier-remaining">
                    {progress.remaining.toLocaleString()} XLM more to reach{" "}
                    {LOYALTY_TIER_LABELS[progress.nextTier.tier]}
                  </p>
                  <div className="flex items-center gap-1 font-medium text-foreground" data-testid="dated-threshold">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Next evaluation threshold: {progress.nextThresholdDate} (requires {TIER_RETENTION_DAYS[progress.nextTier.tier]}d retention)</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="font-medium text-primary text-base" data-testid="max-tier-reached">
                Max Tier Reached
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rewards Ledger: Earned & Redeemed */}
      <Card data-testid="rewards-ledger-card">
        <CardHeader>
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" /> Reward Multipliers & Ledger
              </CardTitle>
              <CardDescription>
                Reconciled audit log of earned multipliers, discounts, and redemptions.
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-xs text-muted-foreground block">Reconciled Balance</span>
                <span className="text-xl font-bold tabular-nums text-foreground" data-testid="ledger-balance">
                  {ledger.balance.toLocaleString()} XLM
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary Row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 rounded-lg border bg-muted/20 p-3 text-sm">
            <div>
              <span className="text-xs text-muted-foreground block">Total Earned</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                +{ledger.totalEarned.toLocaleString()} XLM
              </span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Total Redeemed</span>
              <span className="font-semibold text-muted-foreground">
                -{ledger.totalRedeemed.toLocaleString()} XLM
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-xs text-muted-foreground block">Status</span>
              <Badge variant={ledger.reconciled ? "secondary" : "destructive"} className="text-xs">
                {ledger.reconciled ? "Ledger Reconciled" : "Discrepancy Detected"}
              </Badge>
            </div>
          </div>

          {/* Quick Redemption Form */}
          <form onSubmit={handleRedeem} className="flex flex-col gap-2 sm:flex-row sm:items-center pt-2">
            <div className="flex-1">
              <Input
                type="number"
                placeholder="Amount to redeem (XLM)"
                value={redeemAmount}
                min="1"
                max={ledger.balance}
                step="0.01"
                onChange={(e) => setRedeemAmount(e.target.value)}
                data-testid="redeem-amount-input"
              />
            </div>
            <Button
              type="submit"
              disabled={ledger.balance <= 0 || !redeemAmount}
              data-testid="redeem-submit-btn"
              className="gap-2"
            >
              <Gift className="h-4 w-4" /> Redeem Rewards
            </Button>
          </form>

          {redemptionError && (
            <p className="text-sm text-destructive" role="alert" data-testid="redemption-error">
              {redemptionError}
            </p>
          )}
          {redemptionSuccess && (
            <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1.5" data-testid="redemption-success">
              <CheckCircle2 className="h-4 w-4" /> {redemptionSuccess}
            </p>
          )}

          {/* Ledger Table */}
          <Table data-testid="rewards-ledger-table">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger.entries.map((entry) => (
                <TableRow key={entry.id} data-testid={`ledger-row-${entry.id}`}>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(entry.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={entry.type === "earned" ? "default" : "outline"} className="capitalize">
                      {entry.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{entry.description}</TableCell>
                  <TableCell className={`text-right font-medium tabular-nums ${entry.type === "earned" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                    {entry.type === "earned" ? `+${entry.amount}` : `-${entry.amount}`} XLM
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-xs text-muted-foreground capitalize">{entry.status}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Benefits by Tier Matrix */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Benefits by Tier</h2>
          <CardDescription>
            Higher tiers unlock greater fee discounts and yield boosts on all investments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table data-testid="tier-benefits-table">
            <TableHeader>
              <TableRow>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">Volume Needed</TableHead>
                <TableHead className="text-right">Retention Required</TableHead>
                <TableHead className="text-right">Fee Discount</TableHead>
                <TableHead className="text-right">Yield Boost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loyalty.tiers.map((tier) => (
                <TableRow
                  key={tier.tier}
                  data-testid={`tier-row-${tier.tier}`}
                  data-current={tier.tier === loyalty.tier ? "true" : "false"}
                  className={tier.tier === loyalty.tier ? "bg-muted/50" : undefined}
                >
                  <TableCell className="font-medium">{LOYALTY_TIER_LABELS[tier.tier]}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {tier.threshold.toLocaleString()} XLM
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {TIER_RETENTION_DAYS[tier.tier]} days
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{tier.fee_discount}%</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">+{tier.yield_boost}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
