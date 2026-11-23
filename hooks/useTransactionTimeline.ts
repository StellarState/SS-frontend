"use client";

import { useState, useCallback, useMemo } from "react";
import {
  TransactionAuditRecord,
  TimelineStage,
  SAMPLE_COMPLETED_AUDIT,
  SAMPLE_PENDING_AUDIT,
  SAMPLE_FAILED_AUDIT,
} from "@/lib/analytics/transactionTimeline";

export interface UseTransactionTimelineOptions {
  initialRecord?: TransactionAuditRecord;
  initialSelectedStageIndex?: number;
}

export function useTransactionTimeline(options?: UseTransactionTimelineOptions) {
  const [record, setRecord] = useState<TransactionAuditRecord>(
    options?.initialRecord ?? SAMPLE_COMPLETED_AUDIT
  );
  const [selectedStageIndex, setSelectedStageIndex] = useState<number>(
    options?.initialSelectedStageIndex ?? 0
  );
  const [isCopied, setIsCopied] = useState(false);

  const selectedStage: TimelineStage = useMemo(() => {
    return record.stages[selectedStageIndex] || record.stages[0];
  }, [record.stages, selectedStageIndex]);

  const copyDiagnosticId = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(record.diagnosticId);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  }, [record.diagnosticId]);

  // Updates preserve selected state (#670 acceptance criteria)
  const simulateLiveUpdate = useCallback(() => {
    setRecord((prev) => {
      const updatedStages = prev.stages.map((s, idx) => {
        if (s.name === "submitted" && s.status === "in_progress") {
          return {
            ...s,
            status: "completed" as const,
          };
        }
        if (s.name === "confirmed" && s.status === "pending") {
          return {
            ...s,
            status: "in_progress" as const,
            timestampServer: new Date().toISOString(),
          };
        }
        return s;
      });

      return {
        ...prev,
        stages: updatedStages,
      };
    });
    // selectedStageIndex remains completely preserved!
  }, []);

  const simulateScenario = useCallback((scenario: "completed" | "pending" | "failed") => {
    if (scenario === "completed") {
      setRecord(SAMPLE_COMPLETED_AUDIT);
    } else if (scenario === "pending") {
      setRecord(SAMPLE_PENDING_AUDIT);
    } else if (scenario === "failed") {
      setRecord(SAMPLE_FAILED_AUDIT);
    }
  }, []);

  return {
    record,
    selectedStageIndex,
    setSelectedStageIndex,
    selectedStage,
    isCopied,
    copyDiagnosticId,
    simulateLiveUpdate,
    simulateScenario,
  };
}
