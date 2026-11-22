"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useCovenantMonitoring } from "@/hooks/useCovenantMonitoring";
import {
  MonitoredCovenant,
  calculateCureCountdown,
} from "@/lib/analytics/covenantMonitoring";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  FileCheck,
  Eye,
  X,
  Lock,
  Calendar,
  Activity,
  Layers,
} from "lucide-react";

interface CovenantMonitoringDashboardProps {
  initialCovenants?: MonitoredCovenant[];
  defaultIsAuthorized?: boolean;
}

export function CovenantMonitoringDashboard({
  initialCovenants,
  defaultIsAuthorized = true,
}: CovenantMonitoringDashboardProps) {
  const {
    covenants,
    summaryStats,
    isAuthorizedInvestor,
    setIsAuthorizedInvestor,
    selectedEvidence,
    openSecureDoc,
    closeSecureDoc,
  } = useCovenantMonitoring(initialCovenants, defaultIsAuthorized);

  return (
    <div className="space-y-6 w-full" data-testid="covenant-monitoring-dashboard">
      {/* Overview & Controls Card */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-xl font-bold">Issuer Covenant Monitoring Dashboard</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Real-time headroom monitoring, breach alerts, cure countdowns, and verified evidence (#678).
              </p>
            </div>

            {/* Authorised Investor Mode Switch */}
            <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg border">
              <Switch
                id="investor-auth-switch"
                checked={isAuthorizedInvestor}
                onCheckedChange={setIsAuthorizedInvestor}
                data-testid="investor-mode-toggle"
              />
              <Label htmlFor="investor-auth-switch" className="text-xs cursor-pointer font-medium flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
                Authorised Investor View
              </Label>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {/* Status Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center" data-testid="summary-metrics-bar">
            <div className="p-2.5 rounded-lg border bg-muted/20">
              <span className="text-[11px] text-muted-foreground block">Total Covenants</span>
              <strong className="text-base font-bold">{summaryStats.total}</strong>
            </div>
            <div className="p-2.5 rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200">
              <span className="text-[11px] text-emerald-700 dark:text-emerald-300 block font-medium">Healthy</span>
              <strong className="text-base font-bold text-emerald-700 dark:text-emerald-300">{summaryStats.healthy}</strong>
            </div>
            <div className="p-2.5 rounded-lg border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200">
              <span className="text-[11px] text-amber-700 dark:text-amber-300 block font-medium">Warning Buffer</span>
              <strong className="text-base font-bold text-amber-700 dark:text-amber-300">{summaryStats.warning}</strong>
            </div>
            <div className="p-2.5 rounded-lg border bg-destructive/10 border-destructive/20">
              <span className="text-[11px] text-destructive block font-medium">Breached</span>
              <strong className="text-base font-bold text-destructive">{summaryStats.breached}</strong>
            </div>
          </div>

          {/* Covenant Cards Grid */}
          <div className="grid grid-cols-1 gap-4" data-testid="covenants-grid">
            {covenants.map((cov) => {
              const isBreached = cov.status === "breached";
              const isWarning = cov.status === "warning";
              const countdown = isBreached && cov.cure_deadline ? calculateCureCountdown(cov.cure_deadline) : null;

              return (
                <div
                  key={cov.id}
                  className={`p-4 rounded-lg border transition-all ${
                    isBreached
                      ? "bg-destructive/5 border-destructive/40 shadow-sm"
                      : isWarning
                      ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-300"
                      : "bg-card"
                  }`}
                  data-testid={`covenant-card-${cov.id}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold">{cov.name}</h4>
                        {cov.status === "healthy" && (
                          <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" data-testid={`badge-status-${cov.id}`}>
                            Healthy
                          </Badge>
                        )}
                        {cov.status === "warning" && (
                          <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 flex items-center gap-1" data-testid={`badge-status-${cov.id}`}>
                            <AlertTriangle className="h-3 w-3" /> Warning Pre-Breach
                          </Badge>
                        )}
                        {cov.status === "breached" && (
                          <Badge variant="destructive" className="text-xs flex items-center gap-1" data-testid={`badge-status-${cov.id}`}>
                            <ShieldAlert className="h-3 w-3" /> Breached (Cure Active)
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{cov.description}</p>
                    </div>

                    {/* Headroom Badge */}
                    <div className="sm:text-right shrink-0">
                      <span className="text-[11px] text-muted-foreground block">Safety Headroom:</span>
                      <strong className={`text-sm font-mono ${isBreached ? "text-destructive" : isWarning ? "text-amber-700" : "text-emerald-600"}`}>
                        {cov.headroom_value > 0 ? `+${cov.headroom_value.toLocaleString("en-US")}` : cov.headroom_value.toLocaleString("en-US")} {cov.metric_unit} ({cov.headroom_percent}%)
                      </strong>
                    </div>
                  </div>

                  {/* Values & Thresholds Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Current Value:</span>
                      <strong className="text-sm font-mono text-foreground">
                        {cov.current_value.toLocaleString("en-US")} {cov.metric_unit}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Required Threshold:</span>
                      <span className="font-mono">
                        {cov.direction === "min" ? "≥" : "≤"} {cov.threshold_value.toLocaleString("en-US")} {cov.metric_unit}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Warning Trigger:</span>
                      <span className="font-mono text-amber-700 dark:text-amber-300">
                        {cov.direction === "min" ? "≤" : "≥"} {cov.warning_threshold_value.toLocaleString("en-US")} {cov.metric_unit}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Last Tested:</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {new Date(cov.last_tested_at).toLocaleDateString("en-US")}
                      </span>
                    </div>
                  </div>

                  {/* Breach Details & Cure Countdown */}
                  {isBreached && (
                    <div className="mt-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-xs space-y-2" data-testid={`breach-details-${cov.id}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-destructive flex items-center gap-1.5">
                          <Clock className="h-4 w-4" /> Active Cure Countdown:
                        </span>
                        {countdown && (
                          <strong className="font-mono text-destructive" data-testid={`cure-countdown-${cov.id}`}>
                            {countdown.formattedText}
                          </strong>
                        )}
                      </div>

                      {/* Authorised investor view sees cure plan summary */}
                      {isAuthorizedInvestor && cov.cure_plan_summary ? (
                        <div className="pt-1 text-muted-foreground" data-testid={`cure-plan-${cov.id}`}>
                          <strong className="text-foreground">Cure Plan Remediation:</strong> {cov.cure_plan_summary}
                        </div>
                      ) : (
                        <div className="pt-1 text-muted-foreground italic flex items-center gap-1 text-[11px]">
                          <Lock className="h-3 w-3" /> Cure remediation details restricted to authorised investor groups.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Evidence & Attestations */}
                  <div className="pt-3 border-t mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                      <FileCheck className="h-3.5 w-3.5" /> Supporting Attestations & Evidence ({cov.evidence_records.length}):
                    </span>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {cov.evidence_records.map((ev) => (
                        <Button
                          key={ev.id}
                          size="sm"
                          variant="outline"
                          className="h-6 text-[11px] px-2"
                          onClick={() => openSecureDoc(ev)}
                          data-testid={`btn-view-evidence-${ev.id}`}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          {ev.title}
                          {ev.visibility === "authorized_investors_only" && (
                            <Lock className="h-2.5 w-2.5 ml-1 text-indigo-500" />
                          )}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Secure Evidence Viewer Modal */}
      {selectedEvidence && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" data-testid="secure-evidence-modal">
          <div className="bg-background rounded-lg border shadow-lg max-w-lg w-full p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  Verified Evidence Document
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">{selectedEvidence.title}</p>
              </div>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={closeSecureDoc} data-testid="btn-close-modal">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2.5 text-xs p-3 rounded-md bg-muted/30 border">
              <div>
                <span className="text-muted-foreground block text-[10px]">Document Type:</span>
                <strong className="uppercase">{selectedEvidence.document_type.replace("_", " ")}</strong>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">IPFS Content Identifier (CID):</span>
                <span className="font-mono text-[11px] break-all">{selectedEvidence.cid}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Cryptographic SHA-256 Hash:</span>
                <span className="font-mono text-[11px] break-all">{selectedEvidence.sha256_hash}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Uploaded:</span>
                <span>{new Date(selectedEvidence.uploaded_at).toLocaleString("en-US")}</span>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Button size="sm" onClick={closeSecureDoc} data-testid="btn-modal-dismiss">
                Done Reviewing
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
