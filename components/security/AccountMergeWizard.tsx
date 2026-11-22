"use client";

import React from "react";
import {
  useAccountMergeWizard,
  UseAccountMergeWizardOptions,
} from "@/hooks/useAccountMergeWizard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  KeyRound,
  ArrowRight,
  AlertTriangle,
  RotateCcw,
  Lock,
  FileCheck2,
  Download,
  Wallet,
  Coins,
  Bell,
  LogOut,
} from "lucide-react";

export interface AccountMergeWizardProps {
  initialOptions?: UseAccountMergeWizardOptions;
}

export function AccountMergeWizard({ initialOptions }: AccountMergeWizardProps) {
  const {
    step,
    setStep,
    primaryAccount,
    secondaryAccount,
    conflicts,
    hasBlockingConflict,
    challenge,
    primarySig,
    secondarySig,
    signPrimaryWallet,
    signSecondaryWallet,
    executeMerge,
    auditReceipt,
    revokedSessions,
    mergeError,
    isMerging,
    loadScenario,
  } = useAccountMergeWizard(initialOptions);

  const formatUsd = (val: number) => val.toLocaleString("en-US");

  return (
    <div className="space-y-6" data-testid="account-merge-wizard">
      {/* Top Header & Scenario Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg bg-card border">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight">Account &amp; Wallet Merge Wizard</h2>
            <Badge variant="outline" className="text-xs">Security Certified</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Safely consolidate duplicate wallet accounts, transfer balances, and enforce KYC compliance.
          </p>
        </div>

        {/* Demo/Testing Scenario Switches */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Scenario:</span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => loadScenario("compatible")}
            data-testid="btn-scenario-compatible"
          >
            Compatible Merge
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => loadScenario("conflict")}
            data-testid="btn-scenario-conflict"
          >
            KYC Conflict
          </Button>
        </div>
      </div>

      {/* Wizard Progress Steps Indicator */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs font-medium">
        {[
          { num: 1, label: "1. Select Wallets" },
          { num: 2, label: "2. Preview & Conflicts" },
          { num: 3, label: "3. Dual Ownership Proofs" },
          { num: 4, label: "4. Audit Receipt" },
        ].map((s) => (
          <div
            key={s.num}
            className={`p-2.5 rounded-md border transition-colors ${
              step === s.num
                ? "bg-primary text-primary-foreground font-semibold"
                : step > s.num
                ? "bg-muted text-foreground border-emerald-500/50"
                : "bg-muted/40 text-muted-foreground"
            }`}
            data-testid={`step-indicator-${s.num}`}
          >
            {s.label}
          </div>
        ))}
      </div>

      {mergeError && (
        <Alert variant="destructive" data-testid="merge-error-alert">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Merge Operation Blocked</AlertTitle>
          <AlertDescription>{mergeError}</AlertDescription>
        </Alert>
      )}

      {/* STEP 1: Select & Verify Target Accounts */}
      {step === 1 && (
        <Card data-testid="wizard-step-1">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Step 1: Connected Wallets Identification</CardTitle>
            <CardDescription className="text-xs">
              Review primary identity and the secondary wallet to be merged into it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Primary Account Card */}
              <div className="p-4 rounded-lg border bg-card/60 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="default" className="bg-emerald-600 text-xs">Primary Target Account</Badge>
                  <span className="text-xs text-muted-foreground font-mono">Retained</span>
                </div>
                <div className="font-semibold text-sm">{primaryAccount.alias}</div>
                <div className="text-xs font-mono text-muted-foreground break-all">
                  {primaryAccount.publicKey}
                </div>
                <div className="text-xs pt-1 border-t text-muted-foreground">
                  KYC: <strong className="text-foreground capitalize">{primaryAccount.kycStatus}</strong> ({primaryAccount.kycLegalName || "N/A"})
                </div>
              </div>

              {/* Secondary Account Card */}
              <div className="p-4 rounded-lg border bg-card/60 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">Merging Wallet</Badge>
                  <span className="text-xs text-amber-600 font-mono">Will Be Consolidated</span>
                </div>
                <div className="font-semibold text-sm">{secondaryAccount.alias}</div>
                <div className="text-xs font-mono text-muted-foreground break-all">
                  {secondaryAccount.publicKey}
                </div>
                <div className="text-xs pt-1 border-t text-muted-foreground">
                  KYC: <strong className="text-foreground capitalize">{secondaryAccount.kycStatus}</strong> ({secondaryAccount.kycLegalName || "Unverified"})
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setStep(2)} data-testid="btn-step-1-next">
                <span>Inspect Affected Data &amp; Conflicts</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: Preview Holdings, KYC & Conflict Validation */}
      {step === 2 && (
        <Card data-testid="wizard-step-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Step 2: Affected Data Preview &amp; Conflict Checks</CardTitle>
            <CardDescription className="text-xs">
              Every balance, invoice, and notification record is reconciled before signature verification.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Blocking Conflict Banner */}
            {hasBlockingConflict && (
              <Alert variant="destructive" data-testid="alert-kyc-conflict">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Merge Strictly Blocked: KYC Identity Conflict</AlertTitle>
                <AlertDescription className="space-y-1 mt-1 text-xs">
                  {conflicts
                    .filter((c) => c.severity === "blocking")
                    .map((conflict, idx) => (
                      <p key={idx}>
                        <strong>{conflict.message}:</strong> {conflict.details}
                      </p>
                    ))}
                  <div className="font-semibold text-destructive mt-2">
                    Two differing legally verified identities cannot merge silently. Please contact compliance.
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Affected Data Matrix */}
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted text-muted-foreground font-semibold">
                  <tr>
                    <th className="p-3">Data Property</th>
                    <th className="p-3">Primary Account</th>
                    <th className="p-3">Merging Account</th>
                    <th className="p-3 bg-muted/80">Consolidated Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr data-testid="row-usdc-balance">
                    <td className="p-3 font-medium">USDC Available</td>
                    <td className="p-3 font-mono">${formatUsd(primaryAccount.holdings.usdcBalance)}</td>
                    <td className="p-3 font-mono text-amber-600">+${formatUsd(secondaryAccount.holdings.usdcBalance)}</td>
                    <td className="p-3 font-mono font-bold text-emerald-600 bg-muted/20">
                      ${formatUsd(primaryAccount.holdings.usdcBalance + secondaryAccount.holdings.usdcBalance)}
                    </td>
                  </tr>
                  <tr data-testid="row-xlm-balance">
                    <td className="p-3 font-medium">XLM Native Reserve</td>
                    <td className="p-3 font-mono">{formatUsd(primaryAccount.holdings.xlmBalance)} XLM</td>
                    <td className="p-3 font-mono text-amber-600">+{formatUsd(secondaryAccount.holdings.xlmBalance)} XLM</td>
                    <td className="p-3 font-mono font-bold text-emerald-600 bg-muted/20">
                      {formatUsd(primaryAccount.holdings.xlmBalance + secondaryAccount.holdings.xlmBalance)} XLM
                    </td>
                  </tr>
                  <tr data-testid="row-active-invoices">
                    <td className="p-3 font-medium">Active Invoices</td>
                    <td className="p-3">{primaryAccount.holdings.activeInvoicesCount} invoices</td>
                    <td className="p-3 text-amber-600">+{secondaryAccount.holdings.activeInvoicesCount} invoices</td>
                    <td className="p-3 font-bold bg-muted/20">
                      {primaryAccount.holdings.activeInvoicesCount + secondaryAccount.holdings.activeInvoicesCount} total
                    </td>
                  </tr>
                  <tr data-testid="row-notifications">
                    <td className="p-3 font-medium">Notifications &amp; Activity</td>
                    <td className="p-3">{primaryAccount.notificationCount} alerts</td>
                    <td className="p-3 text-amber-600">+{secondaryAccount.notificationCount} alerts</td>
                    <td className="p-3 font-bold bg-muted/20">
                      {primaryAccount.notificationCount + secondaryAccount.notificationCount} total
                    </td>
                  </tr>
                  <tr data-testid="row-kyc-status">
                    <td className="p-3 font-medium">KYC Tier</td>
                    <td className="p-3 capitalize font-semibold text-emerald-600">{primaryAccount.kycStatus}</td>
                    <td className="p-3 capitalize font-semibold">{secondaryAccount.kycStatus}</td>
                    <td className="p-3 font-bold capitalize text-emerald-600 bg-muted/20">
                      {primaryAccount.kycStatus} (Primary Retained)
                    </td>
                  </tr>
                  <tr data-testid="row-stale-sessions">
                    <td className="p-3 font-medium">Active Sessions</td>
                    <td className="p-3">{primaryAccount.activeSessionIds.length} sessions (Kept)</td>
                    <td className="p-3 text-destructive font-semibold">
                      {secondaryAccount.activeSessionIds.length} sessions (To Be Revoked)
                    </td>
                    <td className="p-3 font-bold text-destructive bg-muted/20">
                      {secondaryAccount.activeSessionIds.length} Revoked
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)} data-testid="btn-step-2-back">
                Back
              </Button>
              <Button
                disabled={hasBlockingConflict}
                onClick={() => setStep(3)}
                data-testid="btn-step-2-next"
              >
                <span>Proceed to Dual Cryptographic Signatures</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: Dual Wallet Cryptographic Ownership Signatures */}
      {step === 3 && (
        <Card data-testid="wizard-step-3">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Step 3: Dual Wallet Ownership Proofs</CardTitle>
            <CardDescription className="text-xs">
              Every wallet must prove private key control over the unified merge challenge before execution.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-md bg-muted/60 font-mono text-xs border text-muted-foreground break-all" data-testid="merge-challenge-box">
              <span className="text-foreground font-semibold">Deterministic Challenge:</span> {challenge}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Primary Signature Card */}
              <div className="p-4 rounded-lg border bg-card/60 space-y-3" data-testid="primary-sig-card">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs">Primary Wallet Proof</span>
                  {primarySig?.verified ? (
                    <Badge variant="default" className="bg-emerald-600 text-xs" data-testid="badge-primary-verified">
                      <ShieldCheck className="w-3 h-3 mr-1" />
                      Signature Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-600 border-amber-500 text-xs">
                      Awaiting Signature
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Proves agreement to absorb secondary wallet assets and assume merged custody.
                </p>
                <Button
                  size="sm"
                  variant={primarySig ? "secondary" : "default"}
                  onClick={signPrimaryWallet}
                  disabled={Boolean(primarySig)}
                  className="w-full text-xs"
                  data-testid="btn-sign-primary"
                >
                  <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                  {primarySig ? "Primary Wallet Signed" : "Sign as Primary Wallet"}
                </Button>
              </div>

              {/* Secondary Signature Card */}
              <div className="p-4 rounded-lg border bg-card/60 space-y-3" data-testid="secondary-sig-card">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs">Secondary Wallet Proof</span>
                  {secondarySig?.verified ? (
                    <Badge variant="default" className="bg-emerald-600 text-xs" data-testid="badge-secondary-verified">
                      <ShieldCheck className="w-3 h-3 mr-1" />
                      Signature Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-600 border-amber-500 text-xs">
                      Awaiting Signature
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Proves voluntary surrender and authorization to merge all balances into primary.
                </p>
                <Button
                  size="sm"
                  variant={secondarySig ? "secondary" : "default"}
                  onClick={signSecondaryWallet}
                  disabled={Boolean(secondarySig)}
                  className="w-full text-xs"
                  data-testid="btn-sign-secondary"
                >
                  <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                  {secondarySig ? "Secondary Wallet Signed" : "Sign as Secondary Wallet"}
                </Button>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                disabled={!primarySig || !secondarySig || isMerging}
                onClick={executeMerge}
                className="bg-emerald-600 hover:bg-emerald-700"
                data-testid="btn-execute-merge"
              >
                <Lock className="w-4 h-4 mr-1.5" />
                <span>{isMerging ? "Consolidating & Revoking..." : "Execute Account Merge"}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 4: Immutable Audit Receipt & Stale Session Revocation */}
      {step === 4 && auditReceipt && (
        <Card data-testid="wizard-step-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Account Merge Complete &amp; Auditable
                </CardTitle>
                <CardDescription className="text-xs">
                  Immutable cryptographic audit receipt generated. All secondary sessions have been revoked.
                </CardDescription>
              </div>
              <Badge variant="default" className="bg-emerald-600 text-xs">
                Receipt Verified
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Session Revocation Confirmation */}
            <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/30 space-y-1.5" data-testid="revoked-sessions-box">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                <LogOut className="w-4 h-4 text-emerald-600" />
                <span>Stale Sessions Revoked ({revokedSessions.length} sessions destroyed)</span>
              </div>
              <p className="text-xs text-muted-foreground">
                All authorization tokens and active web/mobile sessions associated with wallet{" "}
                <strong className="font-mono">{secondaryAccount.publicKey.slice(0, 10)}...</strong> were terminated immediately.
              </p>
              <div className="flex flex-wrap gap-1 pt-1">
                {revokedSessions.map((sess) => (
                  <Badge key={sess} variant="outline" className="font-mono text-[10px]">
                    {sess}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Audit Receipt Details */}
            <div className="p-4 rounded-lg border bg-muted/30 space-y-3 text-xs" data-testid="audit-receipt-details">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Merge Transaction ID</span>
                <span className="font-mono font-bold" data-testid="receipt-merge-id">{auditReceipt.mergeId}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Audit Hash</span>
                <span className="font-mono font-bold text-primary break-all" data-testid="receipt-audit-hash">{auditReceipt.auditHash}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Consolidated USDC Balance</span>
                <span className="font-bold text-emerald-600" data-testid="receipt-consolidated-usdc">
                  ${formatUsd(auditReceipt.consolidatedHoldings.usdcBalance)} USDC
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Consolidated XLM Balance</span>
                <span className="font-bold text-emerald-600" data-testid="receipt-consolidated-xlm">
                  {formatUsd(auditReceipt.consolidatedHoldings.xlmBalance)} XLM
                </span>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const blob = new Blob([JSON.stringify(auditReceipt, null, 2)], {
                    type: "application/json",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `merge-audit-${auditReceipt.mergeId}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                data-testid="btn-download-receipt"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Download Audit Receipt JSON
              </Button>

              <Button
                size="sm"
                onClick={() => loadScenario("compatible")}
                data-testid="btn-merge-done"
              >
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
