"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { usePartialSettlement } from "@/hooks/usePartialSettlement";
import { PartialPaymentContext } from "@/lib/analytics/partialSettlement";
import {
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Receipt,
  FileCheck2,
  Scale,
  RefreshCw,
} from "lucide-react";

interface PartialSettlementEditorProps {
  initialContext?: PartialPaymentContext;
  currentUserAddress?: string;
}

export function PartialSettlementEditor({
  initialContext,
  currentUserAddress = "GBISSUER_ADMIN_KEY_01",
}: PartialSettlementEditorProps) {
  const {
    context,
    allocation,
    validation,
    preview,
    approvalState,
    receipt,
    updatePrincipal,
    updateFees,
    updateReserve,
    autoBalanceReserve,
    requestApproval,
    authorizeApproval,
    rejectApproval,
    resetAllocation,
  } = usePartialSettlement(initialContext, currentUserAddress);

  return (
    <div className="space-y-6 w-full" data-testid="partial-settlement-editor-panel">
      {/* Header & Overview Card */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Scale className="h-5 w-5 text-indigo-600" />
                Partial Settlement Allocation Editor
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Allocate received partial payments across principal, fees, and reserve with pro-rata distribution and authorised approval (#681).
              </p>
            </div>

            {/* Approval State Badge */}
            <div className="flex items-center gap-2" data-testid="approval-status-badge-container">
              <span className="text-xs font-medium text-muted-foreground">Approval State:</span>
              {approvalState.status === "draft" && (
                <Badge variant="outline" className="text-xs" data-testid="badge-status-draft">
                  Draft
                </Badge>
              )}
              {approvalState.status === "pending_approval" && (
                <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" data-testid="badge-status-pending">
                  Pending Authorised Approval
                </Badge>
              )}
              {approvalState.status === "approved" && (
                <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" data-testid="badge-status-approved">
                  ✓ Approved
                </Badge>
              )}
              {approvalState.status === "rejected" && (
                <Badge variant="destructive" className="text-xs" data-testid="badge-status-rejected">
                  Rejected
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {/* Payment Context Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 bg-muted/30 rounded-lg text-xs border">
            <div>
              <span className="text-muted-foreground block">Invoice:</span>
              <strong className="text-sm font-semibold">{context.invoice_title}</strong>
              <span className="block text-[11px] text-muted-foreground font-mono">{context.invoice_id}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Payment Received:</span>
              <strong className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                {context.partial_payment_amount.toLocaleString("en-US")} XLM
              </strong>
            </div>
            <div>
              <span className="text-muted-foreground block">Outstanding Principal:</span>
              <strong>{context.total_outstanding_principal.toLocaleString("en-US")} XLM</strong>
            </div>
            <div>
              <span className="text-muted-foreground block">Accrued Protocol Fees:</span>
              <strong>{context.total_accrued_fees.toLocaleString("en-US")} XLM</strong>
            </div>
          </div>

          {/* Allocation Input Fields */}
          <div className="p-4 rounded-lg border bg-card space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <FileCheck2 className="h-4 w-4 text-indigo-600" />
                Allocation Breakdown (Payment: {context.partial_payment_amount.toLocaleString("en-US")} XLM)
              </h4>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={autoBalanceReserve}
                  data-testid="btn-auto-balance"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Auto-Balance Reserve
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={resetAllocation}
                  data-testid="btn-reset-allocation"
                >
                  Reset
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Principal Field */}
              <div className="space-y-1.5">
                <Label htmlFor="alloc-principal" className="text-xs font-medium">
                  Principal Allocation (XLM)
                </Label>
                <Input
                  id="alloc-principal"
                  type="number"
                  min="0"
                  step="any"
                  value={allocation.principal}
                  onChange={(e) => updatePrincipal(parseFloat(e.target.value) || 0)}
                  disabled={approvalState.status === "approved"}
                  className="font-mono text-sm"
                  data-testid="input-principal"
                />
                <span className="text-[11px] text-muted-foreground">Paid pro-rata to investors</span>
              </div>

              {/* Fees Field */}
              <div className="space-y-1.5">
                <Label htmlFor="alloc-fees" className="text-xs font-medium">
                  Fees Allocation (XLM)
                </Label>
                <Input
                  id="alloc-fees"
                  type="number"
                  min="0"
                  step="any"
                  value={allocation.fees}
                  onChange={(e) => updateFees(parseFloat(e.target.value) || 0)}
                  disabled={approvalState.status === "approved"}
                  className="font-mono text-sm"
                  data-testid="input-fees"
                />
                <span className="text-[11px] text-muted-foreground">Separate from principal</span>
              </div>

              {/* Reserve Field */}
              <div className="space-y-1.5">
                <Label htmlFor="alloc-reserve" className="text-xs font-medium">
                  Reserve Retained (XLM)
                </Label>
                <Input
                  id="alloc-reserve"
                  type="number"
                  min="0"
                  step="any"
                  value={allocation.reserve}
                  onChange={(e) => updateReserve(parseFloat(e.target.value) || 0)}
                  disabled={approvalState.status === "approved"}
                  className="font-mono text-sm"
                  data-testid="input-reserve"
                />
                <span className="text-[11px] text-muted-foreground">Issuer liquidity reserve buffer</span>
              </div>
            </div>

            {/* Reconciliation Validation Banner */}
            <div
              className={`p-3 rounded-md text-xs border flex items-center justify-between ${
                validation.isValid
                  ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 text-emerald-800 dark:text-emerald-200"
                  : "bg-destructive/10 border-destructive/20 text-destructive"
              }`}
              data-testid="allocation-validation-banner"
            >
              <div className="flex items-center gap-2">
                {validation.isValid ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                <span data-testid="allocation-validation-msg">
                  {validation.isValid
                    ? `✓ Balanced: Total allocated exactly equals payment (${validation.totalAllocated.toLocaleString("en-US")} XLM)`
                    : validation.errorReason}
                </span>
              </div>

              <div className="font-mono text-xs">
                Total: <strong>{validation.totalAllocated.toLocaleString("en-US")} XLM</strong> / {context.partial_payment_amount.toLocaleString("en-US")} XLM
              </div>
            </div>
          </div>

          {/* Per-Position Pro-Rata Distribution Preview */}
          <div className="space-y-3" data-testid="distribution-preview-section">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <Scale className="h-4 w-4 text-indigo-600" />
              Per-Position Investor Distribution Preview
            </h4>

            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-xs text-left" data-testid="distribution-preview-table">
                <thead className="bg-muted/50 border-b text-muted-foreground">
                  <tr>
                    <th className="p-2.5">Investor Address</th>
                    <th className="p-2.5">Committed Principal</th>
                    <th className="p-2.5">Share Ratio</th>
                    <th className="p-2.5">Principal Payout</th>
                    <th className="p-2.5">Fee Payout</th>
                    <th className="p-2.5 text-right">Net Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {preview.positions.map((pos) => (
                    <tr key={pos.investor_address} data-testid={`pos-row-${pos.investor_address}`}>
                      <td className="p-2.5 font-mono">{pos.investor_address}</td>
                      <td className="p-2.5">{pos.invested_principal.toLocaleString("en-US")} XLM</td>
                      <td className="p-2.5 font-semibold">{(pos.principal_share_ratio * 100).toFixed(1)}%</td>
                      <td className="p-2.5 font-mono">{pos.principal_payout.toFixed(2)} XLM</td>
                      <td className="p-2.5 font-mono">{pos.fee_payout.toFixed(2)} XLM</td>
                      <td className="p-2.5 font-mono text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {pos.total_payout.toFixed(2)} XLM
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/20 border-t font-semibold">
                  <tr>
                    <td className="p-2.5" colSpan={3}>
                      Totals: Investor Payouts ({preview.totalInvestorPayouts.toFixed(2)} XLM) + Reserve ({preview.reserveRetained.toFixed(2)} XLM)
                    </td>
                    <td className="p-2.5 font-mono">{preview.totalPrincipalDistributed.toFixed(2)} XLM</td>
                    <td className="p-2.5 font-mono">{preview.totalFeesDistributed.toFixed(2)} XLM</td>
                    <td className="p-2.5 font-mono text-right text-emerald-600">
                      {preview.totalInvestorPayouts.toFixed(2)} XLM
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Approval Controls */}
          <div className="p-4 rounded-lg border bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-3" data-testid="approval-controls-section">
            <div>
              <span className="text-xs font-semibold block">Authorised Approval Flow</span>
              <p className="text-[11px] text-muted-foreground">
                Allocations require authorized review before contract execution.
                {approvalState.requested_by && ` (Requested by: ${approvalState.requested_by.slice(0, 10)}...)`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {approvalState.status === "draft" && (
                <Button
                  size="sm"
                  disabled={!validation.isValid}
                  onClick={requestApproval}
                  data-testid="btn-request-approval"
                >
                  <ShieldCheck className="h-4 w-4 mr-1.5" />
                  Submit for Authorised Approval
                </Button>
              )}

              {approvalState.status === "pending_approval" && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive border-destructive/30"
                    onClick={() => rejectApproval("Allocation rejected during internal audit.")}
                    data-testid="btn-reject-approval"
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => authorizeApproval(currentUserAddress)}
                    data-testid="btn-authorize-approval"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    Authorize & Sign Settlement
                  </Button>
                </>
              )}

              {approvalState.status === "approved" && (
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  Authorized & Finalized
                </span>
              )}
            </div>
          </div>

          {/* Final Settlement Receipt View */}
          {receipt && (
            <Card className="border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/20" data-testid="settlement-receipt-view">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
                    <Receipt className="h-4 w-4 text-emerald-600" />
                    Final Settlement Receipt #{receipt.receipt_id}
                  </CardTitle>
                  <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-800">
                    Finalized
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-2 text-xs space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 bg-background rounded border">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Payment Received:</span>
                    <strong>{receipt.total_payment_received.toLocaleString("en-US")} XLM</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Principal Allocated:</span>
                    <strong>{receipt.allocation.principal.toLocaleString("en-US")} XLM</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Fees Allocated:</span>
                    <strong>{receipt.allocation.fees.toLocaleString("en-US")} XLM</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Reserve Retained:</span>
                    <strong>{receipt.allocation.reserve.toLocaleString("en-US")} XLM</strong>
                  </div>
                </div>

                <div className="text-[11px] text-muted-foreground flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span>Approved by: <strong className="font-mono text-foreground">{receipt.approved_by}</strong></span>
                  <span>Tx Hash: <strong className="font-mono text-foreground">{receipt.tx_hash}</strong></span>
                  <span>Timestamp: {new Date(receipt.approved_at).toLocaleString("en-US")}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
