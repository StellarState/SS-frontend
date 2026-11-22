"use client";

import { useState, useMemo, useCallback } from "react";
import {
  JournalEntry,
  JournalFilterOptions,
  filterJournalEntries,
  exportJournalAsync,
  SAMPLE_JOURNAL_ENTRIES,
  ASYNC_DOWNLOAD_THRESHOLD,
} from "@/lib/analytics/transactionJournal";

export interface UseTransactionJournalOptions {
  initialEntries?: JournalEntry[];
  initialFilters?: JournalFilterOptions;
}

export function useTransactionJournal(options?: UseTransactionJournalOptions) {
  const [entries, setEntries] = useState<JournalEntry[]>(
    options?.initialEntries ?? SAMPLE_JOURNAL_ENTRIES
  );
  const [filters, setFilters] = useState<JournalFilterOptions>(
    options?.initialFilters ?? {
      startDate: "",
      endDate: "",
      account: "",
      status: "all",
      batchId: "",
    }
  );
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [lastDownloadedFile, setLastDownloadedFile] = useState<string | null>(null);

  const filteredEntries = useMemo(() => {
    return filterJournalEntries(entries, filters);
  }, [entries, filters]);

  const updateFilters = useCallback((partial: Partial<JournalFilterOptions>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      startDate: "",
      endDate: "",
      account: "",
      status: "all",
      batchId: "",
    });
  }, []);

  const isLargeExport = filteredEntries.length >= ASYNC_DOWNLOAD_THRESHOLD;

  const downloadJournal = useCallback(
    async (format: "csv" | "xlsx") => {
      setIsExporting(true);
      setExportProgress(10);
      try {
        const { content, mimeType, filename } = await exportJournalAsync(
          filteredEntries,
          format,
          (pct) => setExportProgress(pct)
        );

        // Client-side download trigger
        if (typeof window !== "undefined") {
          const blob = new Blob([content], { type: mimeType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          setLastDownloadedFile(filename);
        }
      } finally {
        setIsExporting(false);
        setExportProgress(0);
      }
    },
    [filteredEntries]
  );

  return {
    entries,
    setEntries,
    filters,
    updateFilters,
    resetFilters,
    filteredEntries,
    isExporting,
    exportProgress,
    lastDownloadedFile,
    downloadJournal,
    isLargeExport,
  };
}
