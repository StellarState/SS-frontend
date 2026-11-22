"use client";

import React from "react";
import {
  useTransactionTimeline,
  UseTransactionTimelineOptions,
} from "@/hooks/useTransactionTimeline";
import {
  buildExplorerTxUrl,
  sanitizeDiagnostics,
} from "@/lib/analytics/transactionTimeline";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  Layers,
  Sparkles,
  Server,
  Cpu,
  RefreshCw,
  Terminal,
} from "lucide-react";

export interface TransactionAuditTimelineProps {
  initialOptions?: UseTransactionTimelineOptions;
}

export function TransactionAuditTimeline({
  initialOptions,
}: TransactionAuditTimelineProps) {
  const {
    record,
    selectedStageIndex,
    setSelectedStageIndex,
    selectedStage,
    isCopied,
    copyDiagnosticId,
    simulateLiveUpdate,
    simulateScenario,
  } = useTransactionTimeline(initialOptions);

  const sanitizedMeta = sanitizeDiagnostics(record.meta.rawDiagnostics);

  const getStatusBadge = () => {
    switch (record.overallStatus) {
      case "completed":
        return (
          <Badge variant="default" className="bg-emerald-600 text-xs" data-testid="status-badge-completed">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            Settled On-Chain
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="text-xs" data-testid="status-badge-failed">
            <XCircle className="w-3.5 h-3.5 mr-1" />
            Terminal Failure
          </Badge>
        );
      case "pending":
      default:
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-500 text-xs" data-testid="status-badge-pending">
            <Clock className="w-3.5 h-3.5 mr-1" />
            In-Flight Processing
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6" data-testid="transaction-audit-timeline">
      {/* Header with Copyable Diagnostic ID */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg bg-card border">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight">Transaction Replay &amp; Audit Timeline</h2>
            {getStatusBadge()}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Tx ID: <strong className="font-mono text-foreground">{record.txId}</strong></span>
            <span>&bull;</span>
            <div className="flex items-center gap-1 bg-muted/60 px-2.5 py-1 rounded-md" data-testid="diagnostic-id-container">
              <span>Support Diagnostic ID:</span>
              <strong className="font-mono text-foreground" data-testid="diagnostic-id-value">
                {record.diagnosticId}
              </strong>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 ml-0.5"
                onClick={copyDiagnosticId}
                title="Copy support diagnostic ID"
                data-testid="btn-copy-diagnostic-id"
              >
                {isCopied ? (
                  <Check className="h-3 w-3 text-emerald-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Live Simulator Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={simulateLiveUpdate}
            data-testid="btn-simulate-update"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Simulate Update
          </Button>

          <div className="flex items-center border rounded-md p-0.5 bg-background text-xs">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => simulateScenario("completed")}
              data-testid="btn-sim-completed"
            >
              Completed
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => simulateScenario("pending")}
              data-testid="btn-sim-pending"
            >
              Pending
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => simulateScenario("failed")}
              data-testid="btn-sim-failed"
            >
              Failed
            </Button>
          </div>
        </div>
      </div>

      {/* Terminal Failure Alert */}
      {record.overallStatus === "failed" && (
        <Alert variant="destructive" data-testid="terminal-failure-alert">
          <XCircle className="h-4 w-4" />
          <AlertTitle className="text-xs font-semibold">Terminal Execution Failure</AlertTitle>
          <AlertDescription className="text-xs mt-1">
            {record.stages.find((s) => s.status === "failed")?.failureReason ||
              "Smart contract execution failed on-chain. State changes were safely rolled back."}
          </AlertDescription>
        </Alert>
      )}

      {/* 5-Stage Stepper Bar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            Cross-Layer Execution Stages (UI &rarr; API &rarr; Horizon &rarr; Soroban)
          </CardTitle>
          <CardDescription className="text-xs">
            Click on any stage to inspect dual server/chain timestamps, event logs, and cryptographic hashes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
            {record.stages.map((stage, idx) => {
              const isSelected = selectedStageIndex === idx;

              return (
                <div
                  key={stage.name}
                  onClick={() => setSelectedStageIndex(idx)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? "ring-2 ring-primary border-primary bg-primary/5 font-semibold"
                      : "bg-card/60 hover:bg-muted/40"
                  }`}
                  data-testid={`stage-step-${stage.name}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase font-mono text-muted-foreground">
                      Stage {idx + 1}
                    </span>
                    {stage.status === "completed" && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                    {stage.status === "in_progress" && (
                      <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                    )}
                    {stage.status === "pending" && (
                      <Clock className="w-3.5 h-3.5 text-muted-foreground opacity-50" />
                    )}
                    {stage.status === "failed" && (
                      <XCircle className="w-3.5 h-3.5 text-destructive" />
                    )}
                  </div>
                  <div className="font-semibold text-xs capitalize truncate">{stage.label}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    Layer: {stage.sourceLayer}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Stage Inspection Drawer */}
      <Card data-testid="stage-details-card">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold capitalize flex items-center gap-2">
                <span>Stage {selectedStageIndex + 1}: {selectedStage.label}</span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {selectedStage.sourceLayer}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Detailed audit trace for stage {selectedStage.name}
              </CardDescription>
            </div>

            {selectedStage.contractEventName && (
              <Badge variant="secondary" className="font-mono text-xs" data-testid="contract-event-badge">
                Event: {selectedStage.contractEventName}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-4 text-xs">
          {/* Dual Timestamps: Server and Chain Sources */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="stage-timestamps-box">
            <div className="p-3 rounded-md bg-muted/40 border space-y-1">
              <div className="font-semibold text-muted-foreground flex items-center gap-1.5 text-xs">
                <Server className="w-3.5 h-3.5 text-primary" />
                Server / API Timestamp
              </div>
              <div className="font-mono text-xs" data-testid="timestamp-server">
                {selectedStage.timestampServer
                  ? new Date(selectedStage.timestampServer).toISOString()
                  : "N/A (Pending submission)"}
              </div>
            </div>

            <div className="p-3 rounded-md bg-muted/40 border space-y-1">
              <div className="font-semibold text-muted-foreground flex items-center gap-1.5 text-xs">
                <Cpu className="w-3.5 h-3.5 text-emerald-600" />
                Chain Ledger Timestamp
              </div>
              <div className="font-mono text-xs" data-testid="timestamp-chain">
                {selectedStage.timestampChain
                  ? new Date(selectedStage.timestampChain).toISOString()
                  : "N/A (Not yet committed on ledger)"}
              </div>
            </div>
          </div>

          {/* Transaction / Envelope Hash linked to Explorer */}
          {selectedStage.hash && (
            <div className="p-3 rounded-md bg-muted/30 border space-y-1.5" data-testid="stage-hash-box">
              <div className="font-semibold text-xs text-muted-foreground">
                Cryptographic Transaction Hash
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs break-all" data-testid="stage-hash-value">
                  {selectedStage.hash}
                </span>
                <a
                  href={buildExplorerTxUrl(selectedStage.hash, record.network)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline text-xs shrink-0 font-medium"
                  data-testid="stage-explorer-link"
                >
                  <span>Explorer</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* Sanitized Diagnostics (Strictly Excludes Secrets) */}
          <div className="space-y-1.5 pt-2 border-t">
            <div className="font-semibold text-xs flex items-center gap-1 text-muted-foreground">
              <Terminal className="w-3.5 h-3.5" />
              Sanitized Telemetry &amp; Diagnostics (Secrets Excluded)
            </div>
            <pre className="p-3 rounded-md bg-muted/60 border font-mono text-[11px] overflow-x-auto text-foreground" data-testid="sanitized-diagnostics-pre">
              {JSON.stringify(sanitizedMeta, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
