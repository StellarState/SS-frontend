"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useLegalTerms } from "@/hooks/useLegalTerms";
import { GoverningTermsVersion, TermsAcceptanceRecord } from "@/lib/analytics/legalTerms";
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  History,
  Lock,
} from "lucide-react";

interface LegalTermsPanelProps {
  invoiceId?: string;
  investorAddress?: string;
  initialTerms?: GoverningTermsVersion;
  initialAcceptance?: TermsAcceptanceRecord | null;
  onInvestmentSubmit?: () => void;
}

export function LegalTermsPanel({
  invoiceId = "inv-terms-001",
  investorAddress = "GBINVESTOR_CURRENT_WALLET",
  initialTerms,
  initialAcceptance,
  onInvestmentSubmit,
}: LegalTermsPanelProps) {
  const {
    currentTerms,
    acceptance,
    hasAgreedCheckbox,
    setHasAgreedCheckbox,
    expandedClauseIds,
    toggleClause,
    acceptanceCheck,
    isSubmissionReady,
    acceptTerms,
    bumpTermsVersion,
    acceptanceHistory,
  } = useLegalTerms(initialTerms, initialAcceptance);

  return (
    <Card className="w-full border shadow-sm" data-testid="legal-terms-panel">
      <CardHeader className="pb-3 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              <CardTitle className="text-xl font-bold">Governing Legal Terms</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Legally binding invoice financing agreement, assignment provisions, and dispute terms (#679).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono" data-testid="terms-version-badge">
              Version: {currentTerms.version_id}
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-[11px] text-muted-foreground hover:text-foreground"
              onClick={() => bumpTermsVersion()}
              title="Simulate an upstream version update to test invalidation"
              data-testid="btn-simulate-version-bump"
            >
              Test Version Bump
            </Button>
          </div>
        </div>

        {/* Governing Jurisdiction Header */}
        <div className="text-xs text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>Jurisdiction: <strong className="text-foreground">{currentTerms.jurisdiction}</strong></span>
          <span>Governing Law: <strong className="text-foreground">{currentTerms.governing_law}</strong></span>
          <span>Effective: <strong>{new Date(currentTerms.effective_date).toLocaleDateString("en-US")}</strong></span>
        </div>

        {/* Version Invalidation / Warning Notice */}
        {!acceptanceCheck.isValid && acceptance && (
          <div
            className="mt-3 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2"
            data-testid="version-mismatch-warning"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <strong>Updated Terms Notice:</strong> {acceptanceCheck.reason}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Clauses with Plain Language Summaries & Expandable Governing Text */}
        <div className="space-y-3" data-testid="clauses-list">
          {currentTerms.clauses.map((clause) => {
            const isExpanded = expandedClauseIds.includes(clause.id);

            return (
              <div
                key={clause.id}
                className="p-3.5 rounded-lg border bg-card transition-all"
                data-testid={`clause-card-${clause.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold">{clause.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {clause.plain_language_summary}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 shrink-0"
                    onClick={() => toggleClause(clause.id)}
                    data-testid={`toggle-clause-btn-${clause.id}`}
                  >
                    {isExpanded ? (
                      <>
                        Hide Legal Text <ChevronUp className="h-3.5 w-3.5 ml-1" />
                      </>
                    ) : (
                      <>
                        View Governing Text <ChevronDown className="h-3.5 w-3.5 ml-1" />
                      </>
                    )}
                  </Button>
                </div>

                {/* Expanded Full Governing Legal Text */}
                {isExpanded && (
                  <div
                    className="mt-3 p-3 rounded bg-muted/40 border text-xs text-muted-foreground font-serif leading-relaxed italic"
                    data-testid={`governing-text-${clause.id}`}
                  >
                    &ldquo;{clause.governing_legal_text}&rdquo;
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Acceptance Workflow Section */}
        <div className="p-4 rounded-lg border bg-muted/20 space-y-3" data-testid="acceptance-section">
          <div className="flex items-start gap-2.5">
            <input
              type="checkbox"
              id="terms-agree-checkbox"
              checked={hasAgreedCheckbox}
              onChange={(e) => setHasAgreedCheckbox(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 cursor-pointer text-indigo-600"
              data-testid="terms-agreement-checkbox"
            />
            <label htmlFor="terms-agree-checkbox" className="text-xs leading-relaxed cursor-pointer font-medium">
              I have reviewed and agree to the governing terms (<strong>{currentTerms.version_id}</strong>) for this invoice.
              I acknowledge the assignment of receivables, waterfall distributions, and dispute remediation procedures.
            </label>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t">
            <div className="text-xs">
              {acceptanceCheck.isValid ? (
                <span className="text-emerald-600 font-semibold flex items-center gap-1" data-testid="acceptance-confirmed-badge">
                  <CheckCircle2 className="h-4 w-4" />
                  Terms Accepted for Version {acceptance?.accepted_version_id}
                </span>
              ) : (
                <span className="text-muted-foreground flex items-center gap-1" data-testid="acceptance-pending-text">
                  <Lock className="h-3.5 w-3.5" />
                  Acceptance required before submitting investment
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                disabled={!hasAgreedCheckbox || acceptanceCheck.isValid}
                onClick={() => acceptTerms(investorAddress, invoiceId)}
                data-testid="btn-record-acceptance"
              >
                <ShieldCheck className="h-4 w-4 mr-1 text-indigo-600" />
                Sign & Record Acceptance
              </Button>

              <Button
                size="sm"
                className="h-8 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={!isSubmissionReady}
                onClick={() => onInvestmentSubmit?.()}
                data-testid="btn-submit-investment"
              >
                Submit Investment
              </Button>
            </div>
          </div>
        </div>

        {/* Immutable Acceptance History */}
        {acceptanceHistory.length > 0 && (
          <div className="space-y-2 pt-2 border-t" data-testid="acceptance-history-section">
            <h5 className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
              <History className="h-3.5 w-3.5" /> Acceptance Audit History ({acceptanceHistory.length})
            </h5>
            <div className="space-y-1.5">
              {acceptanceHistory.map((rec, idx) => (
                <div
                  key={`${rec.accepted_version_id}-${idx}`}
                  className="p-2 rounded border bg-muted/10 text-xs font-mono flex items-center justify-between"
                  data-testid={`history-entry-${rec.accepted_version_id}`}
                >
                  <div>
                    <span className="font-semibold text-foreground">Version: {rec.accepted_version_id}</span>
                    <span className="text-muted-foreground text-[10px] block font-sans">
                      Accepted: {new Date(rec.accepted_at).toLocaleString("en-US")} · Wallet: {rec.investor_address.slice(0, 10)}...
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Tx: {rec.tx_hash ?? "N/A"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
