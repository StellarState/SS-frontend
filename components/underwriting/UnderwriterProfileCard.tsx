"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Award,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Copy,
  Check,
  TrendingUp,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  type UnderwriterProfile,
  calculateReputation,
  reconcileCapacity,
  getUnderwriterTier,
  sortSlashingHistory,
  toggleFollowUnderwriter,
  truncateAddress,
} from "@/lib/underwriting/reputationProfile";
import { transactionExplorerUrl } from "@/lib/stellarAddress";
import { cn } from "@/lib/utils";

export interface UnderwriterProfileCardProps {
  profile: UnderwriterProfile;
  onFollowToggle?: (id: string, isFollowed: boolean) => void;
  className?: string;
  defaultExpandedSlashing?: boolean;
}

function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function UnderwriterProfileCard({
  profile,
  onFollowToggle,
  className,
}: UnderwriterProfileCardProps) {
  const [isFollowed, setIsFollowed] = useState<boolean>(Boolean(profile.isFollowed));
  const [copied, setCopied] = useState<boolean>(false);

  const reputation = profile.reputation ?? calculateReputation(profile.invoiceHistory);
  const capacity =
    profile.capacity ??
    reconcileCapacity(profile.totalCapacity, profile.activeCover, profile.reservedCover);

  const tier = getUnderwriterTier(reputation.score);
  const sortedSlashing = sortSlashingHistory(profile.slashingHistory);

  const handleCopy = () => {
    if (!profile.address) return;
    navigator.clipboard?.writeText(profile.address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleFollowToggle = () => {
    const nextState = toggleFollowUnderwriter(profile.id, !isFollowed);
    setIsFollowed(nextState);
    if (onFollowToggle) {
      onFollowToggle(profile.id, nextState);
    }
  };

  // Stacked bar calculations
  const totalCap = capacity.totalCapacity || 1;
  const activePct = Math.min(100, (capacity.activeCover / totalCap) * 100);
  const reservedPct = Math.min(100 - activePct, (capacity.reservedCover / totalCap) * 100);
  const availablePct = Math.max(0, 100 - (activePct + reservedPct));

  return (
    <Card
      data-testid={`underwriter-card-${profile.id}`}
      className={cn("overflow-hidden border transition-shadow hover:shadow-md", className)}
    >
      <CardHeader className="bg-card pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3
                data-testid="underwriter-name"
                className="text-lg font-bold tracking-tight text-foreground"
              >
                {profile.name}
              </h3>
              <Badge
                variant="outline"
                data-testid="underwriter-tier-badge"
                data-tier={tier.id}
                className={cn("px-2 py-0.5 text-xs font-semibold uppercase tracking-wider", tier.className)}
              >
                <Award className="mr-1 h-3 w-3" />
                {tier.label}
              </Badge>
            </div>

            {profile.address && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span data-testid="underwriter-address" className="font-mono">
                  {truncateAddress(profile.address)}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  title="Copy public address"
                  aria-label="Copy public address"
                  className="rounded p-1 hover:bg-muted focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  )}
                </button>
                <a
                  href={`https://stellar.expert/explorer/testnet/account/${profile.address}`}
                  target="_blank"
                  rel="noreferrer"
                  title="View on Stellar Expert"
                  aria-label="View on Stellar Expert"
                  className="rounded p-1 hover:bg-muted focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </a>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={isFollowed ? "default" : "outline"}
              size="sm"
              onClick={handleFollowToggle}
              data-testid="follow-underwriter-btn"
              aria-label={isFollowed ? `Unfollow ${profile.name}` : `Follow ${profile.name}`}
              className="gap-1.5"
            >
              {isFollowed ? (
                <>
                  <BookmarkCheck className="h-4 w-4" />
                  <span>Following</span>
                </>
              ) : (
                <>
                  <Bookmark className="h-4 w-4" />
                  <span>Follow</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-2">
        {/* Reputation & Track Record Section */}
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Reputation Track Record</span>
              <span
                data-testid="reputation-score"
                className="text-lg font-extrabold text-foreground"
              >
                {reputation.score !== null ? `${reputation.score}/100` : "Unrated"}
              </span>
            </div>

            <div className="text-xs text-muted-foreground">
              <span data-testid="reputation-sample-count">
                {reputation.sampleCount > 0
                  ? `Evaluated on ${reputation.sampleCount} settled/defaulted sample${
                      reputation.sampleCount === 1 ? "" : "s"
                    }`
                  : "No completed invoice history"}
              </span>
            </div>
          </div>

          {/* Confidence Range */}
          <div className="mb-4 text-xs text-muted-foreground" data-testid="reputation-confidence-range">
            Confidence interval:{" "}
            <span className="font-semibold text-foreground">
              {reputation.confidenceRange.min}% – {reputation.confidenceRange.max}%
            </span>{" "}
            <span className="text-muted-foreground/80">(95% Wilson confidence based on sample size)</span>
          </div>

          {/* Metrics Counters */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-md border bg-card p-2">
              <div className="text-muted-foreground">Settled Invoices</div>
              <div
                data-testid="settled-count"
                className="mt-1 text-base font-bold text-emerald-600 dark:text-emerald-400"
              >
                {reputation.settledCount}
              </div>
            </div>

            <div className="rounded-md border bg-card p-2">
              <div className="text-muted-foreground">Defaulted Invoices</div>
              <div
                data-testid="defaulted-count"
                className={cn(
                  "mt-1 text-base font-bold",
                  reputation.defaultedCount > 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-foreground"
                )}
              >
                {reputation.defaultedCount}
              </div>
            </div>

            <div className="rounded-md border bg-card p-2">
              <div className="text-muted-foreground">Active Cover</div>
              <div
                data-testid="active-count"
                className="mt-1 text-base font-bold text-sky-600 dark:text-sky-400"
              >
                {reputation.activeCount}
              </div>
            </div>
          </div>
        </div>

        {/* Capacity Reconciliation Section */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold">Capacity Reconciliation</h4>
              {capacity.isExhausted ? (
                <Badge
                  variant="destructive"
                  data-testid="capacity-exhausted-badge"
                  className="text-xs"
                >
                  Exhausted
                </Badge>
              ) : capacity.isOverallocated ? (
                <Badge
                  variant="destructive"
                  data-testid="capacity-overallocated-badge"
                  className="text-xs"
                >
                  Overallocated
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  data-testid="capacity-available-badge"
                  className="border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 text-xs"
                >
                  Available
                </Badge>
              )}
            </div>

            <div className="text-xs text-muted-foreground">
              Utilization:{" "}
              <span data-testid="utilization-rate" className="font-semibold text-foreground">
                {capacity.utilizationRate}%
              </span>
            </div>
          </div>

          {/* Visual Stacked Progress Bar */}
          <div
            className="h-3 w-full overflow-hidden rounded-full bg-muted flex"
            data-testid="capacity-breakdown-bar"
            aria-label={`Capacity breakdown: ${activePct.toFixed(1)}% active, ${reservedPct.toFixed(
              1
            )}% reserved, ${availablePct.toFixed(1)}% available`}
          >
            <div
              style={{ width: `${activePct}%` }}
              className="h-full bg-sky-500 transition-all"
              title={`Active Cover: ${formatUSD(capacity.activeCover)}`}
            />
            <div
              style={{ width: `${reservedPct}%` }}
              className="h-full bg-amber-500 transition-all"
              title={`Reserved Cover: ${formatUSD(capacity.reservedCover)}`}
            />
            <div
              style={{ width: `${availablePct}%` }}
              className="h-full bg-emerald-500 transition-all"
              title={`Available Capacity: ${formatUSD(capacity.availableCapacity)}`}
            />
          </div>

          {/* Capacity Breakdown Figures */}
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div className="rounded border bg-card p-2">
              <div className="text-muted-foreground">Total Capacity</div>
              <div data-testid="total-capacity" className="mt-0.5 font-bold text-foreground">
                {formatUSD(capacity.totalCapacity)}
              </div>
            </div>

            <div className="rounded border bg-card p-2">
              <div className="flex items-center gap-1 text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-sky-500" />
                <span>Active Cover</span>
              </div>
              <div data-testid="active-cover" className="mt-0.5 font-bold text-sky-600 dark:text-sky-400">
                {formatUSD(capacity.activeCover)}
              </div>
            </div>

            <div className="rounded border bg-card p-2">
              <div className="flex items-center gap-1 text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span>Reserved Cover</span>
              </div>
              <div data-testid="reserved-cover" className="mt-0.5 font-bold text-amber-600 dark:text-amber-400">
                {formatUSD(capacity.reservedCover)}
              </div>
            </div>

            <div className="rounded border bg-card p-2">
              <div className="flex items-center gap-1 text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Available</span>
              </div>
              <div
                data-testid="available-capacity"
                className="mt-0.5 font-bold text-emerald-600 dark:text-emerald-400"
              >
                {formatUSD(capacity.availableCapacity)}
              </div>
            </div>
          </div>
        </div>

        {/* Slashing Event Audit Log List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4
              data-testid="slashing-history-header"
              className="text-sm font-semibold flex items-center gap-1.5"
            >
              <span>Slashing & Stake Audit Log</span>
              <span className="text-xs font-normal text-muted-foreground">
                ({sortedSlashing.length})
              </span>
            </h4>
            <div className="text-xs text-muted-foreground">
              Staked: <span className="font-semibold text-foreground">{formatUSD(profile.totalStaked)}</span>
            </div>
          </div>

          {sortedSlashing.length === 0 ? (
            <div
              data-testid="no-slashing-notice"
              className="flex items-center gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-50/50 p-3 text-xs text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300"
            >
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>
                <strong>Clean track record:</strong> 0 slashing events or collateral penalties on record.
              </span>
            </div>
          ) : (
            <div
              data-testid="slashing-events-list"
              className="divide-y rounded-md border bg-card text-xs"
            >
              {sortedSlashing.map((event) => (
                <div
                  key={event.id}
                  data-testid="slashing-event-row"
                  className="flex flex-col gap-1 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
                      <span className="font-semibold text-foreground">{event.reason}</span>
                    </div>
                    <div className="text-muted-foreground">{formatDate(event.timestamp)}</div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-rose-600 dark:text-rose-400">
                      -{formatUSD(event.amount)}
                    </span>
                    {event.txHash && (
                      <a
                        href={transactionExplorerUrl(event.txHash)}
                        target="_blank"
                        rel="noreferrer"
                        data-testid="slashing-tx-hash"
                        className="inline-flex items-center gap-1 font-mono text-muted-foreground hover:text-foreground"
                        title="View transaction on block explorer"
                      >
                        <span>{truncateAddress(event.txHash)}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
