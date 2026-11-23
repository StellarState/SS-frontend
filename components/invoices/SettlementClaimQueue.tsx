"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSettlementQueue } from "@/hooks/useSettlementQueue";
import {
  SettlementClaimItem,
  OperatorDelegation,
  verifyOperatorDelegation,
} from "@/lib/analytics/settlementQueue";
import { CheckCircle2, AlertCircle, RefreshCw, UserCheck, ShieldCheck } from "lucide-react";

interface SettlementClaimQueueProps {
  investorAddress?: string;
  defaultOperatorAddress?: string;
}

export function SettlementClaimQueue({
  investorAddress = "GBINVESTOR_DEMO_ADDRESS",
  defaultOperatorAddress = "GBOPERATOR_AUTHORIZED_01",
}: SettlementClaimQueueProps) {
  const {
    eligibleItems,
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
    reconciliation,
    delegation,
    isOperatorMode,
    setIsOperatorMode,
    auditLog,
    executeSingleClaim,
    executeBulkClaim,
  } = useSettlementQueue(investorAddress, defaultOperatorAddress);

  const [activeTab, setActiveTab] = useState<"queue" | "audit">("queue");

  // Check operator delegation validity
  const operatorAuth = isOperatorMode
    ? verifyOperatorDelegation(
        delegation,
        defaultOperatorAddress,
        investorAddress,
        reconciliation.netTotalPayout,
      )
    : { isAuthorized: true };

  return (
    <Card className="w-full border shadow-sm" data-testid="settlement-claim-queue-panel">
      <CardHeader className="pb-3 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Settlement Claim Queue
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Automated settlement claiming with bulk reconciliation and delegated operator execution (#682).
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Operator Mode Switch */}
            <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg border">
              <Switch
                id="operator-mode-toggle"
                checked={isOperatorMode}
                onCheckedChange={setIsOperatorMode}
                data-testid="operator-mode-switch"
              />
              <Label htmlFor="operator-mode-toggle" className="text-xs cursor-pointer font-medium flex items-center gap-1">
                <UserCheck className="h-3.5 w-3.5" />
                Claim as Operator
              </Label>
            </div>

            <div className="flex rounded-md border p-0.5 text-xs bg-muted/40">
              <button
                type="button"
                onClick={() => setActiveTab("queue")}
                className={`px-3 py-1 rounded font-medium transition-all ${
                  activeTab === "queue" ? "bg-background shadow text-foreground" : "text-muted-foreground"
                }`}
                data-testid="tab-queue"
              >
                Queue ({eligibleItems.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("audit")}
                className={`px-3 py-1 rounded font-medium transition-all ${
                  activeTab === "audit" ? "bg-background shadow text-foreground" : "text-muted-foreground"
                }`}
                data-testid="tab-audit"
              >
                Audit Log ({auditLog.length})
              </button>
            </div>
          </div>
        </div>

        {/* Operator Delegation Scope Notice */}
        {isOperatorMode && (
          <div
            className={`mt-3 p-2.5 rounded-md text-xs border flex items-center justify-between ${
              operatorAuth.isAuthorized
                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 text-emerald-800 dark:text-emerald-200"
                : "bg-destructive/10 border-destructive/20 text-destructive"
            }`}
            data-testid="operator-status-banner"
          >
            <div className="flex items-center gap-2">
              {operatorAuth.isAuthorized ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span>
                <strong>Operator Mode:</strong> {defaultOperatorAddress.slice(0, 8)}... claiming for {investorAddress.slice(0, 8)}...
                {!operatorAuth.isAuthorized && ` (${operatorAuth.reason})`}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] font-mono">
                Scope: claims:execute
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                Active
              </Badge>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-4">
        {activeTab === "queue" ? (
          <div className="space-y-4">
            {/* Bulk Action and Reconciliation Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-muted/30 rounded-lg border">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAll}
                  className="text-xs h-7"
                  data-testid="select-all-btn"
                >
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  className="text-xs h-7"
                  disabled={selectedIds.length === 0}
                  data-testid="clear-selection-btn"
                >
                  Clear
                </Button>
                <span className="text-xs text-muted-foreground ml-1" data-testid="selected-count-label">
                  {selectedIds.length} of {eligibleItems.length} selected
                </span>
              </div>

              {selectedIds.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="text-right text-xs" data-testid="bulk-reconciliation-summary">
                    <div>
                      Gross: <span className="font-semibold">{reconciliation.totalGrossReturn.toFixed(2)} XLM</span> |
                      Net Payout: <span className="font-bold text-emerald-600 dark:text-emerald-400">{reconciliation.netTotalPayout.toFixed(2)} XLM</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Fees: {(reconciliation.totalProtocolFees + reconciliation.totalNetworkFees).toFixed(2)} XLM
                      {reconciliation.isReconciled && (
                        <span className="text-emerald-600 ml-1.5 font-medium" data-testid="reconciliation-verified-badge">
                          ✓ Reconciled
                        </span>
                      )}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    className="h-8 text-xs font-semibold"
                    disabled={isOperatorMode && !operatorAuth.isAuthorized}
                    onClick={() => executeBulkClaim()}
                    data-testid="execute-bulk-claim-btn"
                  >
                    Claim Selected ({reconciliation.netTotalPayout.toFixed(2)} XLM)
                  </Button>
                </div>
              )}
            </div>

            {/* Claims Queue Items */}
            {eligibleItems.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground" data-testid="no-eligible-claims-msg">
                No eligible settlement claims available. Only settled invoices with positive returns appear here.
              </div>
            ) : (
              <div className="space-y-2.5">
                {eligibleItems.map((item) => {
                  const isSelected = selectedIds.includes(item.invoice_id);
                  const isClaimed = item.claim_status === "claimed";
                  const isFailed = item.claim_status === "failed";

                  return (
                    <div
                      key={item.invoice_id}
                      className={`p-3.5 rounded-lg border transition-all ${
                        isClaimed
                          ? "bg-muted/20 opacity-70 border-dashed"
                          : isFailed
                          ? "bg-destructive/5 border-destructive/30"
                          : isSelected
                          ? "bg-primary/5 border-primary/40 shadow-sm"
                          : "bg-card hover:bg-muted/10"
                      }`}
                      data-testid={`claim-item-${item.invoice_id}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isClaimed}
                            onChange={() => toggleSelect(item.invoice_id)}
                            className="mt-1 h-4 w-4 rounded border-gray-300 cursor-pointer"
                            data-testid={`checkbox-${item.invoice_id}`}
                          />

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{item.invoice_title}</span>
                              <Badge variant="outline" className="text-[10px] font-mono">
                                {item.invoice_id}
                              </Badge>

                              {isClaimed && (
                                <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  Claimed
                                </Badge>
                              )}
                              {isFailed && (
                                <Badge variant="destructive" className="text-[10px]" data-testid={`failed-badge-${item.invoice_id}`}>
                                  Failed (Retryable)
                                </Badge>
                              )}
                            </div>

                            {/* Failure details if any */}
                            {isFailed && item.last_error && (
                              <p className="text-xs text-destructive mt-1 font-medium flex items-center gap-1" data-testid={`error-msg-${item.invoice_id}`}>
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                {item.last_error}
                              </p>
                            )}

                            {/* Fee & payout breakdown */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1.5">
                              <span>Gross: <strong className="text-foreground">{item.gross_return_amount.toFixed(2)} XLM</strong></span>
                              <span>Protocol Fee (0.25%): <strong>{item.protocol_fee_amount.toFixed(4)} XLM</strong></span>
                              <span>Est. Gas: <strong>{item.estimated_network_fee} XLM</strong></span>
                              <span>Net Payout: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{item.net_payout_amount.toFixed(2)} XLM</strong></span>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          {isFailed ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
                              onClick={() => executeSingleClaim(item.invoice_id, false)}
                              data-testid={`retry-btn-${item.invoice_id}`}
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Retry Claim
                            </Button>
                          ) : !isClaimed ? (
                            <div className="flex items-center gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-muted-foreground hover:text-destructive"
                                onClick={() => executeSingleClaim(item.invoice_id, true)}
                                title="Simulate failure to verify independent retryability"
                                data-testid={`simulate-fail-btn-${item.invoice_id}`}
                              >
                                Test Fail
                              </Button>
                              <Button
                                size="sm"
                                className="h-7 text-xs font-medium"
                                disabled={isOperatorMode && !operatorAuth.isAuthorized}
                                onClick={() => executeSingleClaim(item.invoice_id, false)}
                                data-testid={`claim-single-btn-${item.invoice_id}`}
                              >
                                Claim
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Settled
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Audit History Tab */
          <div className="space-y-3" data-testid="audit-log-section">
            {auditLog.length === 0 ? (
              <p className="text-center py-6 text-xs text-muted-foreground">
                No claim transactions executed in this session yet.
              </p>
            ) : (
              <div className="space-y-2">
                {auditLog.map((record) => (
                  <div
                    key={record.id}
                    className="p-3 rounded-md border text-xs flex items-center justify-between"
                    data-testid={`audit-entry-${record.id}`}
                  >
                    <div>
                      <div className="font-semibold flex items-center gap-2">
                        <span>{record.invoice_title}</span>
                        <Badge
                          variant={record.status === "success" ? "secondary" : "destructive"}
                          className="text-[10px]"
                        >
                          {record.status.toUpperCase()}
                        </Badge>
                        {record.is_delegated && (
                          <Badge variant="outline" className="text-[10px]">
                            Operator: {record.claimed_by_operator?.slice(0, 8)}...
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground text-[11px] mt-0.5">
                        {new Date(record.timestamp).toLocaleTimeString()} · Tx: {record.tx_hash ?? "N/A"}
                        {record.error_message && ` · Error: ${record.error_message}`}
                      </p>
                    </div>

                    <div className="text-right">
                      {record.status === "success" ? (
                        <span className="font-bold text-emerald-600">
                          +{record.net_payout.toFixed(2)} XLM
                        </span>
                      ) : (
                        <span className="text-destructive font-medium">Failed</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
