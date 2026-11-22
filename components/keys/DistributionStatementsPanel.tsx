"use client";

import React from "react";
import {
  useDistributionStatements,
  UseDistributionStatementsOptions,
} from "@/hooks/useDistributionStatements";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Percent,
  Receipt,
  Scale,
  ShieldCheck,
  Lock,
} from "lucide-react";

export interface DistributionStatementsPanelProps {
  keyId?: string;
  initialOptions?: UseDistributionStatementsOptions;
}

export function DistributionStatementsPanel({
  keyId,
  initialOptions,
}: DistributionStatementsPanelProps) {
  const {
    statements,
    allStatementsCount,
    totals,
    isAuthorized,
    periodTypeFilter,
    setPeriodTypeFilter,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    downloadCsv,
    downloadPdf,
  } = useDistributionStatements({
    keyId,
    ...initialOptions,
  });

  return (
    <div className="space-y-6" data-testid="distribution-statements-panel">
      {/* Panel Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-lg bg-card border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold tracking-tight">Key-Holder Distribution Statements</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Tax, withholding, and dividend accounting statements reconciled against creator key distribution pools.
          </p>
        </div>

        {/* Action Downloads */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-9"
            onClick={downloadCsv}
            data-testid="btn-download-csv"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export CSV
          </Button>

          <Button
            variant="default"
            size="sm"
            className="text-xs h-9"
            onClick={downloadPdf}
            data-testid="btn-download-pdf"
          >
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Authorization Warning if Not Logged In */}
      {!isAuthorized && (
        <Alert variant="destructive" data-testid="auth-required-alert">
          <Lock className="h-4 w-4" />
          <AlertTitle className="text-xs font-semibold">Authorisation Required</AlertTitle>
          <AlertDescription className="text-xs mt-1">
            Official tax and accounting statements require wallet authorization. Connect your wallet to enable cryptographic downloads.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="statements-summary-cards">
        <Card className="p-4 bg-card/60">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Total Net Received</span>
            <Receipt className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono" data-testid="total-net-value">
            {totals.totalNet.toLocaleString("en-US", { minimumFractionDigits: 2 })} XLM
          </div>
          <span className="text-[11px] text-muted-foreground">Net of fees and taxes</span>
        </Card>

        <Card className="p-4 bg-card/60">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Gross Distribution</span>
            <Scale className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono" data-testid="total-gross-value">
            {totals.totalGross.toLocaleString("en-US", { minimumFractionDigits: 2 })} XLM
          </div>
          <span className="text-[11px] text-muted-foreground">Gross key-holder share</span>
        </Card>

        <Card className="p-4 bg-card/60">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Taxes Withheld (10%)</span>
            <Percent className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono" data-testid="total-taxes-value">
            {totals.totalTaxes.toLocaleString("en-US", { minimumFractionDigits: 2 })} XLM
          </div>
          <span className="text-[11px] text-muted-foreground">Form 1099 compliant</span>
        </Card>

        <Card className="p-4 bg-card/60">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Pool Reconciliation</span>
            {totals.reconciled ? (
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-destructive" />
            )}
          </div>
          <div className="mt-2 text-sm font-semibold flex items-center gap-1.5" data-testid="reconciliation-badge">
            {totals.reconciled ? (
              <Badge variant="outline" className="text-emerald-600 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                100% Reconciled
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-xs">
                Discrepancy
              </Badge>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground">Net + Fees + Taxes = Gross</span>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-md bg-muted/40 border text-xs">
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <Button
            variant={periodTypeFilter === "all" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs px-2.5"
            onClick={() => setPeriodTypeFilter("all")}
            data-testid="filter-period-all"
          >
            All Periods
          </Button>
          <Button
            variant={periodTypeFilter === "final_period" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs px-2.5"
            onClick={() => setPeriodTypeFilter("final_period")}
            data-testid="filter-period-final"
          >
            Final Quarters
          </Button>
          <Button
            variant={periodTypeFilter === "partial_period" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs px-2.5"
            onClick={() => setPeriodTypeFilter("partial_period")}
            data-testid="filter-period-partial"
          >
            Partial Periods
          </Button>

          <span className="text-muted-foreground mx-1">|</span>

          <Button
            variant={statusFilter === "all" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs px-2.5"
            onClick={() => setStatusFilter("all")}
            data-testid="filter-status-all"
          >
            All Statuses
          </Button>
          <Button
            variant={statusFilter === "final" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs px-2.5"
            onClick={() => setStatusFilter("final")}
            data-testid="filter-status-final"
          >
            Finalized
          </Button>
          <Button
            variant={statusFilter === "estimated" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs px-2.5"
            onClick={() => setStatusFilter("estimated")}
            data-testid="filter-status-estimated"
          >
            Estimated
          </Button>
        </div>

        <div className="relative w-full sm:w-56">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search statement period..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs bg-background"
            data-testid="input-search-statements"
          />
        </div>
      </div>

      {/* Statements Table */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span>Distribution History ({statements.length} of {allStatementsCount} records)</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Review detailed gross calculations, snapshot share allocations, and final withholding tax amounts.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" data-testid="statements-table">
              <thead className="bg-muted/50 border-b font-medium text-muted-foreground">
                <tr>
                  <th className="p-3">Period / Statement</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Snapshot Share</th>
                  <th className="p-3">Total Pool</th>
                  <th className="p-3">Gross Amount</th>
                  <th className="p-3">Protocol Fee</th>
                  <th className="p-3">Withholding Tax</th>
                  <th className="p-3 font-semibold text-foreground">Net Payout</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {statements.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-muted-foreground">
                      No distribution statements matching current filter criteria.
                    </td>
                  </tr>
                ) : (
                  statements.map((s) => {
                    const isEstimated = s.status === "estimated";

                    return (
                      <tr
                        key={s.id}
                        className="hover:bg-muted/30 transition-colors"
                        data-testid={`statement-row-${s.id}`}
                      >
                        <td className="p-3">
                          <div className="font-semibold text-foreground">{s.periodLabel}</div>
                          <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                            {s.id} &bull; {s.periodType === "final_period" ? "Final Period" : "Partial Period"}
                          </div>
                        </td>

                        <td className="p-3">
                          {isEstimated ? (
                            <Badge
                              variant="outline"
                              className="text-amber-600 border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 text-[10px] font-semibold"
                              data-testid={`badge-status-estimated-${s.id}`}
                            >
                              <Clock className="w-3 h-3 mr-1" />
                              Estimated
                            </Badge>
                          ) : (
                            <Badge
                              variant="default"
                              className="bg-emerald-600 text-[10px] font-semibold text-white"
                              data-testid={`badge-status-final-${s.id}`}
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Finalized
                            </Badge>
                          )}
                        </td>

                        <td className="p-3">
                          <div className="font-mono font-medium">
                            {s.snapshotKeyQuantity} / {s.circulatingKeySupply} keys
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {s.snapshotSharePercentage.toFixed(2)}% of supply
                          </div>
                        </td>

                        <td className="p-3 font-mono">
                          {s.totalDistributionPool.toLocaleString("en-US", { minimumFractionDigits: 2 })} {s.currency}
                        </td>

                        <td className="p-3 font-mono font-semibold">
                          {s.grossAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} {s.currency}
                        </td>

                        <td className="p-3 font-mono text-muted-foreground">
                          -{s.protocolFeeAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} {s.currency}
                        </td>

                        <td className="p-3 font-mono text-amber-600 dark:text-amber-400">
                          -{s.withholdingTaxAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} {s.currency}
                        </td>

                        <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                          {s.netAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} {s.currency}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
