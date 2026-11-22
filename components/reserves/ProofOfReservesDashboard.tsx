"use client";

import React, { useState } from "react";
import {
  useProofOfReserves,
  UseProofOfReservesOptions,
} from "@/hooks/useProofOfReserves";
import { ReserveNetwork } from "@/lib/analytics/proofOfReserves";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  ExternalLink,
  RefreshCw,
  Coins,
  Scale,
  FileCheck2,
  FileQuestion,
  Copy,
  Check,
} from "lucide-react";

export interface ProofOfReservesDashboardProps {
  initialOptions?: UseProofOfReservesOptions;
}

export function ProofOfReservesDashboard({
  initialOptions,
}: ProofOfReservesDashboardProps) {
  const {
    summary,
    filteredAccounts,
    filterNetwork,
    setFilterNetwork,
    isLoading,
    isError,
    refreshSnapshot,
    simulateState,
  } = useProofOfReserves(initialOptions);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatUsd = (val: number) => val.toLocaleString("en-US");

  const isBalanced = summary.reserve_gap >= 0;
  const formattedGap = isBalanced
    ? `+$${formatUsd(summary.reserve_gap)} ${summary.accounts[0]?.asset_symbol || "USDC"}`
    : `-$${formatUsd(Math.abs(summary.reserve_gap))} ${summary.accounts[0]?.asset_symbol || "USDC"}`;

  return (
    <div className="space-y-6" data-testid="proof-of-reserves-dashboard">
      {/* Top Header & Snapshot Meta */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg bg-card border">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight">Proof of Reserves Overview</h2>
            {summary.status === "fully_backed" && (
              <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700" data-testid="status-badge-healthy">
                <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                Fully Backed
              </Badge>
            )}
            {summary.status === "undercollateralized" && (
              <Badge variant="destructive" data-testid="status-badge-gap">
                <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                Reserve Deficit
              </Badge>
            )}
            {summary.status === "stale" && (
              <Badge variant="outline" className="text-amber-600 border-amber-500 bg-amber-50 dark:bg-amber-950/40" data-testid="status-badge-stale">
                <Clock className="w-3.5 h-3.5 mr-1" />
                Stale Snapshot
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time public cryptographic and custodial backing verification.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-md" data-testid="snapshot-age-indicator">
            <Clock className="w-3.5 h-3.5" />
            <span>Snapshot Age:</span>
            <strong className="text-foreground">{summary.snapshot_age_text}</strong>
            {summary.is_stale && (
              <span className="text-amber-600 font-semibold">(Stale &gt; 24h)</span>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={refreshSnapshot}
            disabled={isLoading}
            data-testid="refresh-button"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          {/* Scenario Testing Controls */}
          <div className="flex items-center border rounded-md p-0.5 bg-background text-xs">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => simulateState("balanced")}
              data-testid="simulate-balanced-btn"
            >
              Balanced
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => simulateState("gap")}
              data-testid="simulate-gap-btn"
            >
              Gap
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => simulateState("stale")}
              data-testid="simulate-stale-btn"
            >
              Stale
            </Button>
          </div>
        </div>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Network Error</AlertTitle>
          <AlertDescription>
            Failed to refresh latest reserve snapshot. Please try again.
          </AlertDescription>
        </Alert>
      )}

      {/* Exceptional State Notifications */}
      {summary.status === "undercollateralized" && (
        <Alert variant="destructive" data-testid="alert-undercollateralized">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Reserve Deficit Detected</AlertTitle>
          <AlertDescription>
            Total verifiable reserve assets are currently less than outstanding obligations by{" "}
            <strong>${formatUsd(Math.abs(summary.reserve_gap))}</strong>.
            New protocol issuance has been temporarily paused until liquidity rebalancing completes.
          </AlertDescription>
        </Alert>
      )}

      {summary.status === "stale" && (
        <Alert className="border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200" data-testid="alert-stale">
          <Clock className="h-4 w-4 text-amber-600" />
          <AlertTitle>Snapshot Exceeds Freshness Window</AlertTitle>
          <AlertDescription>
            The current proof-of-reserve snapshot is older than 24 hours ({summary.snapshot_age_text}).
            A background attestation query is running to fetch fresh oracle signatures.
          </AlertDescription>
        </Alert>
      )}

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Assets */}
        <Card data-testid="card-total-assets">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-medium">
              <span>Backed Assets</span>
              <Coins className="w-4 h-4 text-muted-foreground" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold" data-testid="value-total-assets">
              ${formatUsd(summary.total_assets)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Across {summary.accounts.length} verified custody accounts
            </p>
          </CardContent>
        </Card>

        {/* Total Obligations */}
        <Card data-testid="card-total-obligations">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-medium">
              <span>Total Obligations</span>
              <Scale className="w-4 h-4 text-muted-foreground" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold" data-testid="value-total-obligations">
              ${formatUsd(summary.total_obligations)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Total customer and settlement claims
            </p>
          </CardContent>
        </Card>

        {/* Reserve Gap (Shown Numerically) */}
        <Card data-testid="card-reserve-gap">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-medium">
              <span>Reserve Gap</span>
              {isBalanced ? (
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-destructive" />
              )}
            </CardDescription>
            <CardTitle
              className={`text-2xl font-bold ${
                isBalanced ? "text-emerald-600" : "text-destructive"
              }`}
              data-testid="value-reserve-gap"
            >
              {formattedGap}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {isBalanced ? "Surplus buffer available" : "Deficit below 100% backing"}
            </p>
          </CardContent>
        </Card>

        {/* Collateralization Ratio */}
        <Card data-testid="card-reserve-ratio">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-medium">
              <span>Backing Ratio</span>
              <span className="text-xs font-semibold">{summary.reserve_ratio.toFixed(1)}%</span>
            </CardDescription>
            <CardTitle className="text-2xl font-bold" data-testid="value-reserve-ratio">
              {summary.reserve_ratio.toFixed(1)}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress
              value={Math.min(summary.reserve_ratio, 120)}
              className={`h-2 ${isBalanced ? "[&>div]:bg-emerald-600" : "[&>div]:bg-destructive"}`}
            />
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid: Accounts & Obligations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Verifiable Custody Accounts (7 Columns) */}
        <div className="lg:col-span-7 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-semibold">
                    Reserve Custody Accounts &amp; On-Chain Balances
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Inspect verifiable on-chain addresses and independent auditor attestations.
                  </CardDescription>
                </div>

                {/* Network Filter */}
                <div className="flex items-center gap-1">
                  {(["all", "stellar-mainnet", "ethereum", "bank-escrow"] as const).map(
                    (net) => {
                      const label =
                        net === "all"
                          ? "All"
                          : net
                              .split("-")
                              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                              .join(" ");
                      return (
                        <Button
                          key={net}
                          variant={filterNetwork === net ? "secondary" : "ghost"}
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setFilterNetwork(net as ReserveNetwork | "all")}
                          data-testid={`filter-${net}`}
                        >
                          {label}
                        </Button>
                      );
                    }
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {filteredAccounts.map((account) => (
                <div
                  key={account.id}
                  className="p-3.5 rounded-lg border bg-card/60 space-y-2 hover:bg-muted/30 transition-colors"
                  data-testid={`account-card-${account.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{account.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {account.asset_symbol}
                        </Badge>
                        <Badge variant="secondary" className="text-[11px] capitalize">
                          {account.network.replace("-", " ")}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span className="font-mono">{account.address.slice(0, 10)}...{account.address.slice(-6)}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => handleCopy(account.id, account.address)}
                          title="Copy address"
                        >
                          {copiedId === account.id ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-sm text-foreground">
                        ${formatUsd(account.balance)} {account.asset_symbol}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Verified On-Chain
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t text-xs">
                    {/* Verifiable Link / Explorer */}
                    <div>
                      {account.explorer_url ? (
                        <a
                          href={account.explorer_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                          data-testid={`explorer-link-${account.id}`}
                        >
                          <span>View on Explorer</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground italic">Off-chain Escrow Account</span>
                      )}
                    </div>

                    {/* Attestation Status with safe fallback */}
                    <div>
                      {account.has_attestation && account.attestation_url ? (
                        <a
                          href={account.attestation_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
                          data-testid={`attestation-link-${account.id}`}
                        >
                          <FileCheck2 className="h-3.5 w-3.5" />
                          <span>Attested ({account.attestation_provider || "Independent CPA"})</span>
                        </a>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-muted-foreground text-xs"
                          data-testid={`attestation-missing-${account.id}`}
                        >
                          <FileQuestion className="h-3.5 w-3.5" />
                          <span>No third-party attestation filed</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Total Obligations & Liabilities Breakdown (5 Columns) */}
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Protocol Obligations Reconciliation
              </CardTitle>
              <CardDescription className="text-xs">
                Audited breakdown of outstanding liabilities backed 1:1 by reserve assets.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {summary.obligations.map((obl) => {
                const percentage =
                  summary.total_obligations > 0
                    ? (obl.obligation_amount / summary.total_obligations) * 100
                    : 0;

                return (
                  <div
                    key={obl.id}
                    className="p-3 rounded-lg border bg-card/60 space-y-1.5"
                    data-testid={`obligation-item-${obl.id}`}
                  >
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span>{obl.category_name}</span>
                      <span className="font-bold">
                        ${formatUsd(obl.obligation_amount)} {obl.asset_symbol}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground">{obl.description}</p>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                      <span>{obl.holder_count} active claim recipients</span>
                      <span>{percentage.toFixed(1)}% of liabilities</span>
                    </div>
                    <Progress value={percentage} className="h-1.5" />
                  </div>
                );
              })}

              <div className="pt-2 border-t flex items-center justify-between font-semibold text-sm">
                <span>Total Obligations Reconciled</span>
                <span data-testid="reconciled-obligations-total">
                  ${formatUsd(summary.total_obligations)} USDC
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
