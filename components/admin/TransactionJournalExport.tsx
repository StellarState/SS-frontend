"use client";

import React from "react";
import {
  useTransactionJournal,
  UseTransactionJournalOptions,
} from "@/hooks/useTransactionJournal";
import {
  TransactionStatus,
  formatMonetaryValue,
} from "@/lib/analytics/transactionJournal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  RotateCcw,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Hash,
} from "lucide-react";

export interface TransactionJournalExportProps {
  initialOptions?: UseTransactionJournalOptions;
}

export function TransactionJournalExport({
  initialOptions,
}: TransactionJournalExportProps) {
  const {
    filters,
    updateFilters,
    resetFilters,
    filteredEntries,
    isExporting,
    exportProgress,
    lastDownloadedFile,
    downloadJournal,
    isLargeExport,
  } = useTransactionJournal(initialOptions);

  const totalVolume = filteredEntries.reduce((sum, e) => sum + e.amount, 0);
  const totalFees = filteredEntries.reduce((sum, e) => sum + e.fee, 0);

  const getStatusBadge = (status: TransactionStatus) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-xs">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-500 text-xs">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="text-xs">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case "reversed":
        return (
          <Badge variant="secondary" className="text-xs">
            <AlertCircle className="w-3 h-3 mr-1" />
            Reversed
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6" data-testid="transaction-journal-export">
      {/* Header and Export Action Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg bg-card border">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Reconciliation Transaction Journal</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Audit-grade journal export supporting CSV and Excel (SpreadsheetML) formats.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadJournal("csv")}
            disabled={isExporting || filteredEntries.length === 0}
            data-testid="btn-export-csv"
          >
            <FileText className="w-4 h-4 mr-1.5 text-blue-600" />
            Export CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadJournal("xlsx")}
            disabled={isExporting || filteredEntries.length === 0}
            data-testid="btn-export-xlsx"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-600" />
            Export XLSX
          </Button>
        </div>
      </div>

      {/* Async Export Progress Bar (For Large Exports) */}
      {isExporting && (
        <Card className="border-primary/50 bg-primary/5" data-testid="export-progress">
          <CardContent className="pt-4 space-y-2">
            <div className="flex justify-between text-xs font-medium">
              <span>Streaming institutional export...</span>
              <span>{exportProgress}%</span>
            </div>
            <Progress value={exportProgress} className="h-2" />
          </CardContent>
        </Card>
      )}

      {lastDownloadedFile && !isExporting && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/30 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <span>
            Successfully generated and downloaded <strong>{lastDownloadedFile}</strong>
          </span>
        </div>
      )}

      {/* Filter Toolbar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Filter className="w-4 h-4" />
              Journal Filter Criteria
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={resetFilters}
              data-testid="btn-reset-filters"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset Filters
            </Button>
          </div>
          <CardDescription className="text-xs">
            Filter transactions by date window, account public key, batch ID, or settlement state.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            {/* Start Date */}
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Start Date</Label>
              <Input
                type="date"
                value={filters.startDate || ""}
                onChange={(e) => updateFilters({ startDate: e.target.value })}
                className="h-8 text-xs"
                data-testid="filter-start-date"
              />
            </div>

            {/* End Date */}
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">End Date</Label>
              <Input
                type="date"
                value={filters.endDate || ""}
                onChange={(e) => updateFilters({ endDate: e.target.value })}
                className="h-8 text-xs"
                data-testid="filter-end-date"
              />
            </div>

            {/* Account Search */}
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Account (Source/Dest)</Label>
              <Input
                type="text"
                placeholder="Search account address..."
                value={filters.account || ""}
                onChange={(e) => updateFilters({ account: e.target.value })}
                className="h-8 text-xs"
                data-testid="filter-account"
              />
            </div>

            {/* Batch ID */}
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Reconciliation Batch ID</Label>
              <Input
                type="text"
                placeholder="e.g. BATCH-REC..."
                value={filters.batchId || ""}
                onChange={(e) => updateFilters({ batchId: e.target.value })}
                className="h-8 text-xs"
                data-testid="filter-batch-id"
              />
            </div>

            {/* Status */}
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Status</Label>
              <select
                value={filters.status || "all"}
                onChange={(e) =>
                  updateFilters({ status: e.target.value as TransactionStatus | "all" })
                }
                className="w-full h-8 px-2 text-xs rounded-md border bg-background"
                data-testid="filter-status"
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="reversed">Reversed</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 bg-muted/40 border rounded-lg flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Filtered Transactions</span>
          <span className="font-bold text-sm" data-testid="filtered-record-count">
            {filteredEntries.length} records
          </span>
        </div>
        <div className="p-3 bg-muted/40 border rounded-lg flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Total Filtered Volume</span>
          <span className="font-bold text-sm" data-testid="total-volume">
            {formatMonetaryValue(totalVolume, "USDC", 2)}
          </span>
        </div>
        <div className="p-3 bg-muted/40 border rounded-lg flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Total Network Fees</span>
          <span className="font-bold text-sm" data-testid="total-fees">
            {formatMonetaryValue(totalFees, "XLM", 7)}
          </span>
        </div>
      </div>

      {/* Journal Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Transaction Journal Preview</CardTitle>
          <CardDescription className="text-xs">
            All monetary figures include explicit currency ISO and required decimal precision.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredEntries.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground" data-testid="no-records-message">
              No transactions match the selected filter criteria.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Source / Destination</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Fee</TableHead>
                    <TableHead>Memo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reconciliation Batch ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => (
                    <TableRow key={entry.id} className="text-xs" data-testid={`journal-row-${entry.id}`}>
                      <TableCell className="font-mono whitespace-nowrap text-muted-foreground">
                        {new Date(entry.timestamp).toISOString().slice(0, 19).replace("T", " ")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-[11px]">
                          {entry.type.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-[11px] max-w-[160px] truncate">
                        <div title={`Source: ${entry.source_account}`}>
                          Src: {entry.source_account.slice(0, 8)}...
                        </div>
                        <div title={`Dest: ${entry.destination_account}`} className="text-muted-foreground">
                          Dst: {entry.destination_account.slice(0, 8)}...
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold whitespace-nowrap">
                        {formatMonetaryValue(entry.amount, entry.currency, entry.precision)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground whitespace-nowrap">
                        {formatMonetaryValue(entry.fee, entry.fee_currency, entry.fee_precision)}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate" title={entry.memo}>
                        {entry.memo}
                      </TableCell>
                      <TableCell>{getStatusBadge(entry.status)}</TableCell>
                      <TableCell>
                        {entry.reconciliation_batch_id ? (
                          <Badge variant="secondary" className="font-mono text-[10px] flex items-center gap-1 w-fit">
                            <Hash className="w-2.5 h-2.5" />
                            {entry.reconciliation_batch_id}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-[11px] italic">N/A</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
