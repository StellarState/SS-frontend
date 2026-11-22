"use client";
import { useCallback, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, Download, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const PREVIEW_ROWS = 20;
const BATCH_SIZE = 50;

const CSV_TEMPLATE =
  "title,amount,dueDate\nExample Invoice,1000,2025-12-31\n";

interface ParsedRow {
  index: number;
  raw: Record<string, string>;
  errors: string[];
}

interface ValidRow {
  title: string;
  amount: number;
  dueDate: string;
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line, i) => {
    const values = line.split(",").map((v) => v.trim());
    const raw: Record<string, string> = {};
    headers.forEach((h, j) => {
      raw[h] = values[j] ?? "";
    });
    return { index: i + 2, raw, errors: [] };
  });
}

function validateRow(row: ParsedRow): string[] {
  const errors: string[] = [];
  const { raw } = row;

  if (!raw.title) errors.push("title is required");
  if (!raw.amount) {
    errors.push("amount is required");
  } else {
    const num = Number(raw.amount);
    if (Number.isNaN(num) || num <= 0) errors.push("amount must be positive");
  }
  if (!raw.duedate && !raw.dueDate && !raw["due_date"]) {
    errors.push("dueDate is required");
  } else {
    const dateVal = raw.duedate ?? raw.dueDate ?? raw["due_date"] ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
      errors.push("dueDate must be YYYY-MM-DD");
    } else if (new Date(dateVal) <= new Date()) {
      errors.push("dueDate must be in the future");
    }
  }
  return errors;
}

async function batchCreateInvoices(rows: ValidRow[]): Promise<void> {
  const batches: ValidRow[][] = [];
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    batches.push(rows.slice(i, i + BATCH_SIZE));
  }
  for (const batch of batches) {
    const res = await fetch("/api/invoices/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoices: batch }),
    });
    if (!res.ok) throw new Error("Bulk import failed");
  }
}

function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadTemplate() {
  downloadCSV("invoice-template.csv", CSV_TEMPLATE);
}

function downloadErrorReport(rows: ParsedRow[]) {
  const errorRows = rows.filter((r) => r.errors.length > 0);
  const header = "row,title,amount,dueDate,errors\n";
  const lines = errorRows
    .map(
      (r) =>
        `${r.index},${r.raw.title ?? ""},${r.raw.amount ?? ""},${
          r.raw.duedate ?? r.raw.dueDate ?? r.raw["due_date"] ?? ""
        },"${r.errors.join("; ")}"`
    )
    .join("\n");
  downloadCSV("import-errors.csv", header + lines);
}

interface ModalContentProps {
  onClose: () => void;
}

function ModalContent({ onClose }: ModalContentProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (validRows: ValidRow[]) => batchCreateInvoices(validRows),
    onSuccess: () => {
      toast.success("Invoices imported successfully");
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      onClose();
    },
    onError: () => {
      toast.error("Import failed — please try again");
    },
  });

  const handleFile = useCallback((file: File) => {
    setFileError(null);
    setRows([]);
    if (!file.name.endsWith(".csv")) {
      setFileError("Only .csv files are accepted.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError("File exceeds the 2 MB limit.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      const validated = parsed.map((r) => ({ ...r, errors: validateRow(r) }));
      setRows(validated);
    };
    reader.readAsText(file);
  }, []);

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  const errorRows = rows.filter((r) => r.errors.length > 0);
  const validRows: ValidRow[] = rows
    .filter((r) => r.errors.length === 0)
    .map((r) => ({
      title: r.raw.title,
      amount: Number(r.raw.amount),
      dueDate: r.raw.duedate ?? r.raw.dueDate ?? r.raw["due_date"] ?? "",
    }));

  async function handleImport() {
    if (validRows.length === 0) return;
    await mutateAsync(validRows);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="mr-1 h-4 w-4" />
          Download template
        </Button>
      </div>

      <div
        className="rounded-lg border-2 border-dashed p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
        onDrop={onDrop}
        onDragOver={onDragOver}
        onClick={() => fileInputRef.current?.click()}
        data-testid="drop-zone"
      >
        <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          Drag and drop a CSV file here, or click to select
        </p>
        <p className="text-xs text-muted-foreground">Max 2 MB · .csv only</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={onInputChange}
          data-testid="file-input"
        />
      </div>

      {fileError && (
        <p className="flex items-center gap-1 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {fileError}
        </p>
      )}

      {rows.length > 0 && (
        <>
          <div className="flex items-center gap-3 text-sm">
            <Badge variant="default">{validRows.length} valid</Badge>
            {errorRows.length > 0 && (
              <Badge variant="destructive">{errorRows.length} errors</Badge>
            )}
          </div>

          <div className="max-h-64 overflow-auto rounded border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, PREVIEW_ROWS).map((row) => (
                  <TableRow
                    key={row.index}
                    className={row.errors.length > 0 ? "bg-destructive/5" : ""}
                  >
                    <TableCell className="text-xs text-muted-foreground">
                      {row.index}
                    </TableCell>
                    <TableCell className="text-sm">{row.raw.title}</TableCell>
                    <TableCell className="text-sm">{row.raw.amount}</TableCell>
                    <TableCell className="text-sm">
                      {row.raw.duedate ??
                        row.raw.dueDate ??
                        row.raw["due_date"] ??
                        ""}
                    </TableCell>
                    <TableCell>
                      {row.errors.length === 0 ? (
                        <Badge variant="default" className="text-xs">
                          OK
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          Error
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {rows.length > PREVIEW_ROWS && (
            <p className="text-xs text-muted-foreground">
              Showing first {PREVIEW_ROWS} of {rows.length} rows.
            </p>
          )}

          {errorRows.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-destructive">
                Validation errors
              </p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {errorRows.map((r) => (
                  <li key={r.index}>
                    <span className="font-medium">Row {r.index}:</span>{" "}
                    {r.errors.join(", ")}
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadErrorReport(rows)}
              >
                <Download className="mr-1 h-4 w-4" />
                Download error report
              </Button>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleImport}
              disabled={validRows.length === 0 || isPending}
            >
              {isPending
                ? "Importing…"
                : `Import ${validRows.length} invoice${validRows.length !== 1 ? "s" : ""}`}
            </Button>
            {errorRows.length > 0 && validRows.length > 0 && (
              <p className="self-center text-xs text-muted-foreground">
                {errorRows.length} row
                {errorRows.length !== 1 ? "s" : ""} with errors will be
                skipped.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function BulkImportModal() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="bulk-import-trigger">
          Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk invoice import</DialogTitle>
        </DialogHeader>
        <ModalContent onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
