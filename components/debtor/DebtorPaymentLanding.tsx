"use client";

import React, { useState } from "react";
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useDebtorPayment } from "@/hooks/useDebtorPayment";
import { RawInvoiceWithInternalPositions } from "@/lib/analytics/debtorPayment";
import {
  Copy,
  Check,
  QrCode,
  CreditCard,
  CheckCircle2,
  Calendar,
  Building,
  Receipt,
  ShieldCheck,
} from "lucide-react";

interface DebtorPaymentLandingProps {
  initialRawInvoice?: RawInvoiceWithInternalPositions;
}

export function DebtorPaymentLanding({ initialRawInvoice }: DebtorPaymentLandingProps) {
  const {
    invoice,
    qrUri,
    copiedField,
    copyToClipboard,
    confirmPayment,
  } = useDebtorPayment(initialRawInvoice);

  const [customPaymentAmount, setCustomPaymentAmount] = useState<number>(() =>
    invoice.remaining_amount > 0 ? invoice.remaining_amount : 1000,
  );

  const isSettled = invoice.status === "settled";

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4 sm:p-6" data-testid="debtor-payment-landing-page">
      {/* Header Card */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-xl font-bold">Public Settlement Payment Portal</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Official payment destination and verified instructions for obligated debtor (#680).
              </p>
            </div>

            {/* Status Badge */}
            <div data-testid="status-badge-container">
              {invoice.status === "due" && (
                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 border-amber-300" data-testid="badge-status-due">
                  Payment Due
                </Badge>
              )}
              {invoice.status === "partial" && (
                <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200" data-testid="badge-status-partial">
                  Partially Paid
                </Badge>
              )}
              {invoice.status === "settled" && (
                <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" data-testid="badge-status-settled">
                  ✓ Fully Settled
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-5 space-y-6">
          {/* Debtor & Invoice Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-muted/20 border text-xs">
            <div className="space-y-1">
              <span className="text-muted-foreground flex items-center gap-1">
                <Building className="h-3.5 w-3.5" /> Debtor Account:
              </span>
              <strong className="text-sm block">{invoice.debtor_name}</strong>
              <span className="font-mono text-muted-foreground text-[11px] block">{invoice.debtor_address}</span>
            </div>

            <div className="space-y-1 sm:text-right">
              <span className="text-muted-foreground flex items-center sm:justify-end gap-1">
                <Calendar className="h-3.5 w-3.5" /> Due Date:
              </span>
              <strong className="text-sm block">{new Date(invoice.due_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</strong>
              <span className="text-muted-foreground text-[11px] block">Invoice: {invoice.invoice_title}</span>
            </div>
          </div>

          {/* Key Financial Metrics */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-lg border bg-card" data-testid="metric-total-due">
              <span className="text-xs text-muted-foreground block">Total Invoice Due</span>
              <strong className="text-base sm:text-lg font-bold">
                {invoice.total_due_amount.toLocaleString("en-US")} {invoice.currency}
              </strong>
            </div>

            <div className="p-3 rounded-lg border bg-card" data-testid="metric-amount-paid">
              <span className="text-xs text-muted-foreground block">Amount Settled</span>
              <strong className="text-base sm:text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                {invoice.amount_paid.toLocaleString("en-US")} {invoice.currency}
              </strong>
            </div>

            <div className="p-3 rounded-lg border bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200" data-testid="metric-remaining-amount">
              <span className="text-xs text-indigo-700 dark:text-indigo-300 block font-medium">Remaining Due</span>
              <strong className="text-base sm:text-lg font-black text-indigo-700 dark:text-indigo-300">
                {invoice.remaining_amount.toLocaleString("en-US")} {invoice.currency}
              </strong>
            </div>
          </div>

          {/* Payment Instructions & Copyable Fields */}
          {!isSettled ? (
            <div className="space-y-4 pt-2">
              <div className="flex flex-col md:flex-row items-center gap-6 p-5 rounded-lg border bg-card">
                {/* QR Code */}
                <div className="flex flex-col items-center justify-center p-3 rounded-md bg-white border shrink-0" data-testid="debtor-payment-qr">
                  <QRCode value={qrUri} size={150} />
                  <span className="text-[10px] text-slate-500 mt-2 font-medium flex items-center gap-1">
                    <QrCode className="h-3 w-3" /> Scan with Stellar Wallet
                  </span>
                </div>

                {/* Details & Copyable References */}
                <div className="space-y-3 w-full text-xs">
                  {/* Copyable Remaining Amount */}
                  <div className="flex items-center justify-between p-2.5 rounded border bg-muted/30">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Payable Amount:</span>
                      <strong className="text-sm font-mono">{invoice.remaining_amount.toFixed(2)} {invoice.currency}</strong>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => copyToClipboard(invoice.remaining_amount.toFixed(2), "Amount")}
                      data-testid="copy-amount-btn"
                    >
                      {copiedField === "Amount" ? (
                        <>
                          <Check className="h-3 w-3 mr-1 text-emerald-600" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 mr-1" /> Copy Amount
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Copyable Payment Reference Memo */}
                  <div className="flex items-center justify-between p-2.5 rounded border bg-muted/30">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Payment Reference (MEMO):</span>
                      <strong className="text-sm font-mono text-indigo-600 dark:text-indigo-400">
                        {invoice.payment_reference}
                      </strong>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => copyToClipboard(invoice.payment_reference, "Reference")}
                      data-testid="copy-ref-btn"
                    >
                      {copiedField === "Reference" ? (
                        <>
                          <Check className="h-3 w-3 mr-1 text-emerald-600" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 mr-1" /> Copy Memo
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Copyable Destination Address */}
                  <div className="flex items-center justify-between p-2.5 rounded border bg-muted/30">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Payment Destination Address:</span>
                      <span className="font-mono text-[11px] block break-all">{invoice.destination_address}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs shrink-0 ml-2"
                      onClick={() => copyToClipboard(invoice.destination_address, "Destination")}
                      data-testid="copy-destination-btn"
                    >
                      {copiedField === "Destination" ? (
                        <>
                          <Check className="h-3 w-3 mr-1 text-emerald-600" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 mr-1" /> Copy Address
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Payment Confirmation Simulation Controls */}
              <div className="p-4 rounded-lg border bg-muted/10 space-y-3" data-testid="confirmation-actions-container">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-indigo-600" />
                    Record Settlement Payment Confirmation
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Simulate debtor transaction confirmation
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2.5">
                  <Input
                    type="number"
                    min="1"
                    max={invoice.remaining_amount}
                    value={customPaymentAmount}
                    onChange={(e) => setCustomPaymentAmount(parseFloat(e.target.value) || 0)}
                    className="h-8 text-xs font-mono max-w-[180px]"
                    placeholder="Payment Amount"
                    data-testid="input-confirm-amount"
                  />

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    disabled={customPaymentAmount <= 0 || customPaymentAmount >= invoice.remaining_amount}
                    onClick={() => confirmPayment(customPaymentAmount)}
                    data-testid="btn-confirm-partial"
                  >
                    Confirm Partial Payment ({customPaymentAmount} {invoice.currency})
                  </Button>

                  <Button
                    size="sm"
                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => confirmPayment(invoice.remaining_amount)}
                    data-testid="btn-confirm-final"
                  >
                    Confirm Full Payment ({invoice.remaining_amount} {invoice.currency})
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Settled Receipt View */
            <div className="p-6 rounded-lg border border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 text-center space-y-3" data-testid="settled-receipt-card">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
              <h3 className="text-base font-bold text-emerald-800 dark:text-emerald-200">
                Invoice Settlement Complete
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                All obligations for this invoice ({invoice.total_due_amount.toLocaleString("en-US")} {invoice.currency}) have been paid in full and credited to the settlement contract.
              </p>

              <div className="pt-2 text-xs text-muted-foreground">
                Reference: <strong className="font-mono text-foreground">{invoice.payment_reference}</strong>
              </div>
            </div>
          )}

          {/* Payment History Audit Trail */}
          {invoice.payments_history && invoice.payments_history.length > 0 && (
            <div className="space-y-2 border-t pt-4" data-testid="payments-history-section">
              <span className="text-xs font-semibold flex items-center gap-1.5">
                <Receipt className="h-3.5 w-3.5" /> Verified Transactions History ({invoice.payments_history.length})
              </span>
              <div className="space-y-1.5">
                {invoice.payments_history.map((tx) => (
                  <div key={tx.tx_hash} className="p-2 rounded border bg-muted/20 flex items-center justify-between text-xs font-mono">
                    <div>
                      <span>Tx: {tx.tx_hash}</span>
                      <span className="text-muted-foreground text-[10px] block font-sans">
                        {new Date(tx.timestamp).toLocaleString("en-US")}
                      </span>
                    </div>
                    <span className="font-bold text-emerald-600">
                      +{tx.amount.toLocaleString("en-US")} {invoice.currency}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
