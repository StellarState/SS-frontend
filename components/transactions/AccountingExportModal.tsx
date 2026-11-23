"use client";

import React, { useMemo, useState } from "react";
import { Download, FileSpreadsheet, Settings2, SlidersHorizontal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PlatformTransaction, PlatformTransactionType } from "@/lib/api";
import {
  type AccountingFormat,
  type CategoryMapping,
  DEFAULT_CATEGORY_MAPPING,
  buildAccountingCsvChunked,
  filterTransactionsByDateRange,
  getPreviewRows,
} from "@/src/utils/accounting";

interface AccountingExportModalProps {
  transactions: PlatformTransaction[];
}

export function AccountingExportModal({ transactions }: AccountingExportModalProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<AccountingFormat>("quickbooks");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showCategorySettings, setShowCategorySettings] = useState(false);
  const [categoryMapping, setCategoryMapping] = useState<CategoryMapping>({
    ...DEFAULT_CATEGORY_MAPPING,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<number | null>(null);

  const filteredTransactions = useMemo(() => {
    return filterTransactionsByDateRange(transactions, startDate, endDate);
  }, [transactions, startDate, endDate]);

  const { headers, rows: previewRows } = useMemo(() => {
    return getPreviewRows(
      format,
      filteredTransactions,
      { categoryMapping, startDate, endDate },
      10
    );
  }, [format, filteredTransactions, categoryMapping, startDate, endDate]);

  const handleCategoryChange = (type: PlatformTransactionType, val: string) => {
    setCategoryMapping((prev) => ({
      ...prev,
      [type]: val,
    }));
  };

  const handleResetCategories = () => {
    setCategoryMapping({ ...DEFAULT_CATEGORY_MAPPING });
  };

  const handleDownload = async () => {
    try {
      setIsExporting(true);
      setExportProgress(0);

      const csvContent = await buildAccountingCsvChunked(format, filteredTransactions, {
        categoryMapping,
        startDate,
        endDate,
        chunkSize: 500,
        onProgress: (pct) => setExportProgress(pct),
      });

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const timestamp = new Date().toISOString().slice(0, 10);
      link.setAttribute("href", url);
      link.setAttribute("download", `stellarstate-${format}-export-${timestamp}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          data-testid="accounting-export-trigger"
        >
          <FileSpreadsheet className="size-4" />
          <span>Accounting Export</span>
        </Button>
      </DialogTrigger>

      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        data-testid="accounting-export-modal"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-5 text-primary" />
            <span>Export Transactions for Accounting</span>
          </DialogTitle>
          <DialogDescription>
            Download your transaction history pre-formatted for QuickBooks, Xero, or custom spreadsheets.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Controls: Format and Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="accounting-format-select">Accounting Software</Label>
              <Select
                value={format}
                onValueChange={(val) => setFormat(val as AccountingFormat)}
              >
                <SelectTrigger id="accounting-format-select" data-testid="export-format-select">
                  <SelectValue placeholder="Select software" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quickbooks" data-testid="format-quickbooks">
                    QuickBooks (CSV)
                  </SelectItem>
                  <SelectItem value="xero" data-testid="format-xero">
                    Xero (CSV)
                  </SelectItem>
                  <SelectItem value="generic" data-testid="format-generic">
                    Generic CSV
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accounting-start-date">From Date</Label>
              <Input
                id="accounting-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="export-start-date"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accounting-end-date">To Date</Label>
              <Input
                id="accounting-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                data-testid="export-end-date"
              />
            </div>
          </div>

          {/* Configurable Category Mapping Section */}
          <div className="border rounded-md p-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">Category Mapping</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 gap-1"
                onClick={() => setShowCategorySettings((prev) => !prev)}
                data-testid="toggle-category-mapping"
              >
                <Settings2 className="size-3.5" />
                {showCategorySettings ? "Hide mapping" : "Configure categories"}
              </Button>
            </div>

            {showCategorySettings && (
              <div className="mt-3 pt-3 border-t space-y-3" data-testid="category-mapping-section">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(Object.keys(DEFAULT_CATEGORY_MAPPING) as PlatformTransactionType[]).map((type) => (
                    <div key={type} className="space-y-1">
                      <Label htmlFor={`cat-map-${type}`} className="text-xs capitalize font-normal">
                        {type} category
                      </Label>
                      <Input
                        id={`cat-map-${type}`}
                        size={1}
                        className="h-8 text-xs"
                        value={categoryMapping[type]}
                        onChange={(e) => handleCategoryChange(type, e.target.value)}
                        data-testid={`category-input-${type}`}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="link"
                    size="sm"
                    className="text-xs h-6 p-0"
                    onClick={handleResetCategories}
                    data-testid="reset-categories-button"
                  >
                    Reset to defaults
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Preview Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span data-testid="preview-count-label">
                Preview (showing first {previewRows.length} of {filteredTransactions.length} matching rows)
              </span>
              <span className="capitalize">{format} format</span>
            </div>

            <div className="border rounded-md overflow-x-auto max-h-56">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    {headers.map((h, i) => (
                      <TableHead key={i} className="py-2 px-3 whitespace-nowrap">
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody data-testid="export-preview-table-body">
                  {previewRows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={headers.length}
                        className="text-center py-6 text-muted-foreground"
                      >
                        No transactions match the selected filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    previewRows.map((r, rowIdx) => (
                      <TableRow key={rowIdx}>
                        {r.map((col, colIdx) => (
                          <TableCell key={colIdx} className="py-1.5 px-3 whitespace-nowrap font-mono text-xs">
                            {col}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            {exportProgress !== null && (
              <span className="flex items-center gap-1.5">
                <Loader2 className="size-3.5 animate-spin" />
                Exporting... {exportProgress}%
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="gap-2"
              onClick={handleDownload}
              disabled={isExporting || filteredTransactions.length === 0}
              data-testid="export-download-button"
            >
              {isExporting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Download className="size-4" />
                  <span>Download {format.toUpperCase()} CSV</span>
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
