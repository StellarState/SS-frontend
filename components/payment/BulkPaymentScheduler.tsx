"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  cancelBulkPaymentRow,
  executeBulkPaymentBatch,
  loadSettlementHistory,
  parseBulkPaymentCsv,
  retryBulkPaymentRow,
  type BulkPaymentBatchPreview,
  type BulkPaymentRow,
  type SettlementHistoryEntry,
} from "@/lib/bulkPayment";

const SAMPLE_CSV = `invoice_id,debtor_reference,amount,scheduled_date,memo
inv-101,DEBTOR-CORP-A,500,2026-07-01,Settlement July Batch
inv-102,DEBTOR-CORP-B,750,2026-07-02,Batch payment 102
inv-103,DEBTOR-CORP-C,1200,2026-07-03,Invoice 103 Final`;

interface BulkPaymentSchedulerProps {
  walletBalance?: number;
  onSubmitPayment?: (item: BulkPaymentRow) => Promise<{ txHash: string }>;
  className?: string;
}

export function BulkPaymentScheduler({
  walletBalance = 5000,
  onSubmitPayment = async (item) => ({
    txHash: `0x${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}`,
  }),
  className,
}: BulkPaymentSchedulerProps) {
  const [startDate, setStartDate] = useState("2026-07-01");
  const [endDate, setEndDate] = useState("2026-07-31");
  const [csvText, setCsvText] = useState(SAMPLE_CSV);
  const [isExecuting, setIsExecuting] = useState(false);
  const [preview, setPreview] = useState<BulkPaymentBatchPreview | null>(() =>
    parseBulkPaymentCsv(SAMPLE_CSV, {
      startDate: "2026-07-01",
      endDate: "2026-07-31",
      availableBalance: walletBalance,
    }),
  );
  const [rows, setRows] = useState<BulkPaymentRow[]>(() => preview?.items ?? []);
  const [history, setHistory] = useState<SettlementHistoryEntry[]>(() => loadSettlementHistory());

  const handleCsvChange = (text: string) => {
    setCsvText(text);
    const parsed = parseBulkPaymentCsv(text, {
      startDate,
      endDate,
      availableBalance: walletBalance,
    });
    setPreview(parsed);
    setRows(parsed.items);
  };

  const handleDateChange = (newStart: string, newEnd: string) => {
    setStartDate(newStart);
    setEndDate(newEnd);
    const parsed = parseBulkPaymentCsv(csvText, {
      startDate: newStart,
      endDate: newEnd,
      availableBalance: walletBalance,
    });
    setPreview(parsed);
    setRows(parsed.items);
  };

  const handleRunBatch = async () => {
    if (!preview || preview.errorCount > 0 || !preview.isBalanceSufficient) return;
    setIsExecuting(true);
    const batchId = `batch-${Date.now()}`;

    const { results } = await executeBulkPaymentBatch(
      batchId,
      preview.items,
      onSubmitPayment,
      (updated) => {
        setRows((prev) => prev.map((r) => (r.rowNumber === updated.rowNumber ? updated : r)));
      },
    );

    setRows(results);
    setHistory(loadSettlementHistory());
    setIsExecuting(false);
  };

  const handleRetry = async (row: BulkPaymentRow) => {
    const updated = await retryBulkPaymentRow("batch-retry", row, onSubmitPayment, (r) => {
      setRows((prev) => prev.map((item) => (item.rowNumber === r.rowNumber ? r : item)));
    });
    setRows((prev) => prev.map((item) => (item.rowNumber === updated.rowNumber ? updated : item)));
    setHistory(loadSettlementHistory());
  };

  const handleCancel = (row: BulkPaymentRow) => {
    const cancelled = cancelBulkPaymentRow(row);
    setRows((prev) => prev.map((item) => (item.rowNumber === cancelled.rowNumber ? cancelled : item)));
  };

  const activeRows = rows.length > 0 ? rows : preview?.items ?? [];

  return (
    <div className={`space-y-6 ${className ?? ""}`} data-testid="bulk-payment-scheduler">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Bulk Invoice Payment Scheduler
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="start-date">Schedule Window Start</Label>
              <Input
                id="start-date"
                type="date"
                data-testid="schedule-start-date"
                value={startDate}
                onChange={(e) => handleDateChange(e.target.value, endDate)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end-date">Schedule Window End</Label>
              <Input
                id="end-date"
                type="date"
                data-testid="schedule-end-date"
                value={endDate}
                onChange={(e) => handleDateChange(startDate, e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="csv-input">Import CSV (invoice_id, debtor, amount, date, memo)</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => handleCsvChange(SAMPLE_CSV)}
              >
                Reset Sample
              </Button>
            </div>
            <Textarea
              id="csv-input"
              data-testid="csv-textarea"
              rows={5}
              className="font-mono text-xs"
              value={csvText}
              onChange={(e) => handleCsvChange(e.target.value)}
            />
          </div>

          {preview && (
            <div
              className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-lg border p-4 bg-muted/20"
              data-testid="preview-reconciliation"
            >
              <div>
                <p className="text-xs text-muted-foreground">Total Invoices</p>
                <p className="text-lg font-bold" data-testid="preview-valid-count">
                  {preview.validCount} valid ({preview.items.length} total)
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Batch Total Amount</p>
                <p className="text-lg font-bold text-primary" data-testid="preview-total-amount">
                  {preview.totalAmount.toLocaleString()} XLM
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Available Wallet Balance</p>
                <p className="text-lg font-bold" data-testid="preview-wallet-balance">
                  {walletBalance.toLocaleString()} XLM
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Validation Status</p>
                <p
                  className={`text-sm font-semibold ${
                    preview.errorCount === 0 && preview.isBalanceSufficient
                      ? "text-green-600"
                      : "text-destructive"
                  }`}
                  data-testid="preview-status"
                >
                  {preview.errorCount > 0
                    ? `${preview.errorCount} Error(s)`
                    : !preview.isBalanceSufficient
                    ? "Insufficient Balance"
                    : "Ready to Submit"}
                </p>
              </div>
            </div>
          )}

          {preview && preview.errors.length > 0 && (
            <Alert variant="destructive" data-testid="unresolved-errors-alert">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Unresolved CSV Validation Errors</AlertTitle>
              <AlertDescription className="mt-1 text-xs">
                <ul className="list-disc pl-5 space-y-0.5">
                  {preview.errors.map((err, i) => (
                    <li key={i} data-testid={`error-row-${err.rowNumber}`}>
                      {err.message}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {preview && !preview.isBalanceSufficient && (
            <Alert variant="destructive" data-testid="insufficient-balance-alert">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Insufficient Wallet Balance</AlertTitle>
              <AlertDescription className="text-xs">
                Batch total ({preview.totalAmount.toLocaleString()} XLM) exceeds available wallet
                balance ({walletBalance.toLocaleString()} XLM) by{" "}
                {preview.balanceShortfall.toLocaleString()} XLM.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              disabled={
                !preview ||
                preview.errorCount > 0 ||
                !preview.isBalanceSufficient ||
                preview.validCount === 0 ||
                isExecuting
              }
              onClick={handleRunBatch}
              data-testid="submit-batch-btn"
            >
              {isExecuting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isExecuting ? "Executing Batch..." : "Schedule & Execute Batch"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Batch Invoices Table with Progress, Retry, and Cancel */}
      {activeRows.length > 0 && (
        <Card data-testid="batch-progress-card">
          <CardHeader>
            <CardTitle className="text-base">Batch Invoices & Execution Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" data-testid="batch-table">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="p-2.5">Row</th>
                    <th className="p-2.5">Invoice</th>
                    <th className="p-2.5">Debtor</th>
                    <th className="p-2.5">Amount (XLM)</th>
                    <th className="p-2.5">Scheduled</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {activeRows.map((row) => (
                    <tr
                      key={row.rowNumber}
                      data-testid={`row-${row.rowNumber}`}
                      className="hover:bg-muted/10"
                    >
                      <td className="p-2.5 font-mono">{row.rowNumber}</td>
                      <td className="p-2.5 font-medium">{row.invoiceId}</td>
                      <td className="p-2.5">{row.debtorReference || "—"}</td>
                      <td className="p-2.5 tabular-nums font-semibold">
                        {row.amount.toLocaleString()}
                      </td>
                      <td className="p-2.5 text-muted-foreground">{row.scheduledDate}</td>
                      <td className="p-2.5">
                        <span className="flex items-center gap-1.5" data-testid={`status-${row.rowNumber}`}>
                          {row.status === "success" && (
                            <Badge className="bg-green-600 hover:bg-green-700 text-white gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Settled
                            </Badge>
                          )}
                          {row.status === "processing" && (
                            <Badge variant="secondary" className="gap-1 animate-pulse">
                              <Loader2 className="h-3 w-3 animate-spin" /> Processing
                            </Badge>
                          )}
                          {row.status === "failed" && (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="h-3 w-3" /> Failed
                            </Badge>
                          )}
                          {row.status === "pending" && (
                            <Badge variant="outline" className="gap-1">
                              <Clock className="h-3 w-3" /> Pending
                            </Badge>
                          )}
                          {row.status === "cancelled" && (
                            <Badge variant="secondary" className="gap-1 line-through">
                              Cancelled
                            </Badge>
                          )}
                        </span>
                        {row.error && (
                          <span className="block text-[10px] text-destructive mt-0.5 max-w-[200px] truncate" title={row.error}>
                            {row.error}
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-right space-x-1">
                        {row.status === "failed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-[11px]"
                            data-testid={`retry-row-${row.rowNumber}`}
                            onClick={() => handleRetry(row)}
                          >
                            <RefreshCw className="mr-1 h-3 w-3" /> Retry
                          </Button>
                        )}
                        {row.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[11px] text-muted-foreground hover:text-destructive"
                            data-testid={`cancel-row-${row.rowNumber}`}
                            onClick={() => handleCancel(row)}
                          >
                            Cancel
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settlement History */}
      {history.length > 0 && (
        <Card data-testid="settlement-history-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Settlement History ({history.length} settlements recorded)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" data-testid="history-table">
                <thead className="border-b bg-muted/20">
                  <tr>
                    <th className="p-2">Invoice</th>
                    <th className="p-2">Debtor Ref</th>
                    <th className="p-2">Amount (XLM)</th>
                    <th className="p-2">Settled At</th>
                    <th className="p-2 font-mono">TX Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {history.slice(0, 10).map((item) => (
                    <tr key={item.id}>
                      <td className="p-2 font-medium">{item.invoiceId}</td>
                      <td className="p-2">{item.debtorReference}</td>
                      <td className="p-2 tabular-nums">{item.amount.toLocaleString()}</td>
                      <td className="p-2 text-muted-foreground">
                        {new Date(item.settledAt).toLocaleString()}
                      </td>
                      <td className="p-2 font-mono text-muted-foreground">{item.txHash}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
