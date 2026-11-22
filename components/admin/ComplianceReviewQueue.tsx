"use client";

import React, { useState } from "react";
import {
  useComplianceQueue,
  UseComplianceQueueOptions,
} from "@/hooks/useComplianceQueue";
import {
  ComplianceCategory,
  RiskTier,
  ComplianceCaseStatus,
  computeSlaStatus,
} from "@/lib/admin/complianceQueue";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Filter,
  CheckCircle2,
  XCircle,
  FileText,
  Search,
  ExternalLink,
  ChevronRight,
  UserCheck,
  History,
  Lock,
} from "lucide-react";

export interface ComplianceReviewQueueProps {
  initialOptions?: UseComplianceQueueOptions;
  isAuthorised?: boolean; // Auth gate (default: true for authenticated compliance personnel)
}

export function ComplianceReviewQueue({
  initialOptions,
  isAuthorised = true,
}: ComplianceReviewQueueProps) {
  const {
    filteredCases,
    filters,
    updateFilters,
    selectedCase,
    setSelectedCaseId,
    makeDecision,
    counts,
  } = useComplianceQueue(initialOptions);

  const [decisionComment, setDecisionComment] = useState("");
  const [decisionError, setDecisionError] = useState<string | null>(null);

  // Acceptance Criterion 1: Only authorised roles access the queue
  if (!isAuthorised) {
    return (
      <div className="container mx-auto py-12" data-testid="compliance-access-denied">
        <Card className="max-w-md mx-auto border-destructive/50">
          <CardHeader className="text-center pb-2">
            <ShieldAlert className="w-12 h-12 text-destructive mx-auto mb-2" />
            <CardTitle className="text-lg font-bold">Access Denied</CardTitle>
            <CardDescription className="text-xs">
              This queue is restricted strictly to authorized compliance officers and compliance admins.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center pt-2">
            <p className="text-xs text-muted-foreground">
              Please authenticate with a verified compliance authority credential to review cases.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleDecision = (action: "approved" | "evidence_requested" | "restricted") => {
    if (!selectedCase) return;
    setDecisionError(null);

    const res = makeDecision(selectedCase.id, action, decisionComment);
    if (res.success) {
      setDecisionComment("");
    } else {
      setDecisionError(res.error || "Decision failed.");
    }
  };

  const getRiskBadge = (tier: RiskTier) => {
    switch (tier) {
      case "critical":
        return (
          <Badge variant="destructive" className="text-[10px] uppercase font-bold" data-testid="risk-badge-critical">
            Critical
          </Badge>
        );
      case "high":
        return (
          <Badge variant="secondary" className="bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200 text-[10px] uppercase font-bold">
            High
          </Badge>
        );
      case "medium":
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-500 text-[10px] uppercase font-bold">
            Medium
          </Badge>
        );
      case "low":
        return (
          <Badge variant="secondary" className="text-[10px] uppercase font-bold">
            Low
          </Badge>
        );
    }
  };

  const getStatusBadge = (status: ComplianceCaseStatus) => {
    switch (status) {
      case "approved":
        return (
          <Badge variant="default" className="bg-emerald-600 text-xs">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "restricted":
        return (
          <Badge variant="destructive" className="text-xs">
            <XCircle className="w-3 h-3 mr-1" />
            Restricted
          </Badge>
        );
      case "evidence_requested":
        return (
          <Badge variant="outline" className="text-blue-600 border-blue-500 text-xs">
            <Clock className="w-3 h-3 mr-1" />
            Evidence Requested
          </Badge>
        );
      case "pending_review":
      default:
        return (
          <Badge variant="secondary" className="text-xs">
            Pending Review
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6" data-testid="compliance-review-queue">
      {/* Header and Live Count Metric Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg bg-card border">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight">Compliance Review Queue</h2>
            <Badge variant="outline" className="text-xs">SLA Monitored</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Operational triage for KYC, AML risk alerts, and protocol account restrictions.
          </p>
        </div>

        {/* Live Counts (Updates immediately after resolution) */}
        <div className="flex items-center gap-2" data-testid="queue-counts-strip">
          <div className="px-3 py-1.5 rounded-md bg-muted/60 border text-center">
            <div className="text-[10px] text-muted-foreground uppercase font-semibold">Active Cases</div>
            <div className="text-sm font-bold font-mono" data-testid="count-pending">
              {counts.pending}
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-md bg-destructive/10 border border-destructive/20 text-center">
            <div className="text-[10px] text-destructive uppercase font-semibold">Critical Risk</div>
            <div className="text-sm font-bold font-mono text-destructive" data-testid="count-critical">
              {counts.critical}
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-500/30 text-center">
            <div className="text-[10px] text-amber-700 dark:text-amber-300 uppercase font-semibold">Escalated/SLA</div>
            <div className="text-sm font-bold font-mono text-amber-700 dark:text-amber-300" data-testid="count-escalated">
              {counts.escalated}
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/30 text-center">
            <div className="text-[10px] text-emerald-800 dark:text-emerald-300 uppercase font-semibold">Resolved</div>
            <div className="text-sm font-bold font-mono text-emerald-800 dark:text-emerald-300" data-testid="count-resolved">
              {counts.resolved}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            {/* Search */}
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Entity Search</Label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Search by name or case ID..."
                  value={filters.search || ""}
                  onChange={(e) => updateFilters({ search: e.target.value })}
                  className="h-8 pl-8 text-xs"
                  data-testid="input-filter-search"
                />
              </div>
            </div>

            {/* Category */}
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Category</Label>
              <select
                value={filters.category || "all"}
                onChange={(e) =>
                  updateFilters({ category: e.target.value as ComplianceCategory | "all" })
                }
                className="w-full h-8 px-2 text-xs rounded-md border bg-background"
                data-testid="select-filter-category"
              >
                <option value="all">All Categories</option>
                <option value="KYC">KYC</option>
                <option value="AML">AML</option>
                <option value="RESTRICTIONS">Restrictions</option>
              </select>
            </div>

            {/* Risk Tier */}
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Risk Tier</Label>
              <select
                value={filters.riskTier || "all"}
                onChange={(e) =>
                  updateFilters({ riskTier: e.target.value as RiskTier | "all" })
                }
                className="w-full h-8 px-2 text-xs rounded-md border bg-background"
                data-testid="select-filter-risk"
              >
                <option value="all">All Risk Tiers</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Status */}
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Case Status</Label>
              <select
                value={filters.status || "all"}
                onChange={(e) =>
                  updateFilters({ status: e.target.value as ComplianceCaseStatus | "all" })
                }
                className="w-full h-8 px-2 text-xs rounded-md border bg-background"
                data-testid="select-filter-status"
              >
                <option value="all">All Statuses</option>
                <option value="pending_review">Pending Review</option>
                <option value="evidence_requested">Evidence Requested</option>
                <option value="approved">Approved</option>
                <option value="restricted">Restricted</option>
              </select>
            </div>

            {/* Assignee */}
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Assignee</Label>
              <select
                value={filters.assignee || "all"}
                onChange={(e) => updateFilters({ assignee: e.target.value })}
                className="w-full h-8 px-2 text-xs rounded-md border bg-background"
                data-testid="select-filter-assignee"
              >
                <option value="all">All Assignees</option>
                <option value="unassigned">Unassigned Only</option>
                <option value="officer.chen@stellarsettle.org">Officer Chen</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Grid: Queue Table & Case Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cases Table (8 or 12 Cols) */}
        <div className={selectedCase ? "lg:col-span-7 space-y-4" : "lg:col-span-12 space-y-4"}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Triage Queue</CardTitle>
              <CardDescription className="text-xs">
                Timezone-independent SLA tracking prioritizing escalated compliance investigations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredCases.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground" data-testid="empty-queue-message">
                  No compliance cases match the active filter criteria.
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead>Entity / Case ID</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Risk</TableHead>
                        <TableHead>SLA Deadline</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCases.map((c) => {
                        const sla = computeSlaStatus(c.slaDeadline);
                        const isSelected = selectedCase?.id === c.id;

                        return (
                          <TableRow
                            key={c.id}
                            className={`text-xs cursor-pointer ${
                              isSelected ? "bg-muted/80 font-medium" : "hover:bg-muted/40"
                            }`}
                            onClick={() => setSelectedCaseId(c.id)}
                            data-testid={`case-row-${c.id}`}
                          >
                            <TableCell>
                              <div className="font-semibold text-foreground">{c.entityName}</div>
                              <div className="font-mono text-[10px] text-muted-foreground">{c.id}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] font-mono">
                                {c.category}
                              </Badge>
                            </TableCell>
                            <TableCell>{getRiskBadge(c.riskTier)}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  sla.isBreached
                                    ? "destructive"
                                    : sla.isEscalated
                                    ? "outline"
                                    : "secondary"
                                }
                                className={`text-[10px] font-mono ${
                                  sla.isEscalated && !sla.isBreached
                                    ? "text-amber-700 border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                                    : ""
                                }`}
                                data-testid={`sla-badge-${c.id}`}
                              >
                                <Clock className="w-2.5 h-2.5 mr-1" />
                                {sla.formattedText}
                              </Badge>
                            </TableCell>
                            <TableCell>{getStatusBadge(c.status)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCaseId(c.id);
                                }}
                                data-testid={`btn-review-${c.id}`}
                              >
                                Review Case
                                <ChevronRight className="w-3.5 h-3.5 ml-1" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Case Drawer / Details Panel (5 Cols) */}
        {selectedCase && (
          <div className="lg:col-span-5 space-y-4" data-testid="compliance-case-drawer">
            <Card className="border-primary/40">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">
                      {selectedCase.entityName}
                    </CardTitle>
                    <CardDescription className="text-xs font-mono">
                      {selectedCase.id} &bull; {selectedCase.category}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setSelectedCaseId(null)}
                    data-testid="btn-close-drawer"
                  >
                    Close
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-4 text-xs">
                {/* Flag Reason */}
                <div className="p-3 rounded-md bg-muted/40 border space-y-1">
                  <div className="font-semibold text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Compliance Triage Flag Reason
                  </div>
                  <p className="text-foreground">{selectedCase.flagReason}</p>
                </div>

                {/* Evidence Records */}
                <div className="space-y-2">
                  <div className="font-semibold text-xs flex items-center justify-between">
                    <span>Submitted Evidence ({selectedCase.evidenceRecords.length})</span>
                  </div>
                  {selectedCase.evidenceRecords.length === 0 ? (
                    <div className="p-2 text-muted-foreground italic text-xs">
                      No customer evidence records uploaded yet.
                    </div>
                  ) : (
                    selectedCase.evidenceRecords.map((ev) => (
                      <div
                        key={ev.id}
                        className="p-2.5 rounded-md border bg-card/60 flex items-center justify-between gap-2"
                        data-testid={`evidence-item-${ev.id}`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="font-medium truncate">{ev.title}</span>
                        </div>
                        <a
                          href={ev.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-0.5 text-[11px] shrink-0"
                        >
                          <span>Inspect</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ))
                  )}
                </div>

                {/* Immutable Audit History */}
                <div className="space-y-2">
                  <div className="font-semibold text-xs flex items-center gap-1">
                    <History className="w-3.5 h-3.5 text-primary" />
                    Immutable Case History ({selectedCase.history.length})
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1" data-testid="immutable-history-timeline">
                    {selectedCase.history.map((h) => (
                      <div
                        key={h.id}
                        className="p-2 rounded border bg-muted/20 space-y-1 text-[11px]"
                        data-testid={`history-entry-${h.id}`}
                      >
                        <div className="flex items-center justify-between text-muted-foreground font-mono text-[10px]">
                          <span>{h.operator}</span>
                          <span>{new Date(h.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div className="font-medium capitalize text-foreground flex items-center gap-1">
                          <Badge variant="outline" className="text-[9px] py-0 px-1">
                            {h.action.replace("_", " ")}
                          </Badge>
                          <span>{h.comment}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Decision Action Form with Required Comments */}
                <div className="p-3.5 rounded-lg border bg-muted/30 space-y-3 pt-3">
                  <div className="font-semibold text-xs flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" />
                    Record Compliance Decision
                  </div>

                  {decisionError && (
                    <Alert variant="destructive" className="py-2" data-testid="decision-error-alert">
                      <AlertDescription className="text-xs">{decisionError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-1">
                    <Label className="text-[11px]">
                      Required Decision Rationale Comment <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      placeholder="Enter substantive regulatory rationale (minimum 5 characters)..."
                      value={decisionComment}
                      onChange={(e) => setDecisionComment(e.target.value)}
                      className="text-xs min-h-[60px]"
                      data-testid="input-decision-comment"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-xs"
                      disabled={decisionComment.trim().length < 5}
                      onClick={() => handleDecision("approved")}
                      data-testid="btn-decision-approve"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Approve Case
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="text-blue-600 border-blue-500 hover:bg-blue-50 text-xs"
                      disabled={decisionComment.trim().length < 5}
                      onClick={() => handleDecision("evidence_requested")}
                      data-testid="btn-decision-evidence"
                    >
                      Request Evidence
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      className="text-xs"
                      disabled={decisionComment.trim().length < 5}
                      onClick={() => handleDecision("restricted")}
                      data-testid="btn-decision-restrict"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      Apply Restrictions
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
