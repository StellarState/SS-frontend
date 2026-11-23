"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import {
  authorizeStatementDownload,
  generateMockStatements,
  generateStatementsCsv,
  type DistributionStatement,
} from "@/lib/distributionStatements";

interface DistributionStatementsTabProps {
  keyId: string;
  keyTitle: string;
  heldKeys: number;
}

export function DistributionStatementsTab({
  keyId,
  keyTitle,
  heldKeys,
}: DistributionStatementsTabProps) {
  const { address } = useAuth();
  const [selectedStatement, setSelectedStatement] =
    useState<DistributionStatement | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const effectiveAddress = address || "GBZXN7PIRZGNMHGA72ODXR6DTZS657SDNVWYTG52M7NA65I4Q2IT5678";

  const statements = useMemo(
    () => generateMockStatements(keyId, keyTitle, effectiveAddress, heldKeys),
    [keyId, keyTitle, effectiveAddress, heldKeys]
  );

  const handleDownloadCsv = (statement?: DistributionStatement) => {
    setAuthError(null);
    const toDownload = statement ? [statement] : statements;
    const targetStatement = statement || statements[0];

    if (targetStatement) {
      const auth = authorizeStatementDownload(address, targetStatement);
      if (!auth.authorized) {
        setAuthError(auth.reason || "Unauthorized download attempt");
        return;
      }
    }

    const csvContent = generateStatementsCsv(toDownload);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      statement
        ? `statement_${statement.statementId}.csv`
        : `distribution_statements_${keyId}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrintPdf = (statement: DistributionStatement) => {
    setAuthError(null);
    const auth = authorizeStatementDownload(address, statement);
    if (!auth.authorized) {
      setAuthError(auth.reason || "Unauthorized download attempt");
      return;
    }
    window.print();
  };

  return (
    <div className="space-y-6" data-testid="distribution-statements-tab">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Distribution Tax & Accounting Statements</h3>
          <p className="text-xs text-muted-foreground">
            Reconciled accounting statements for key distributions, withholding taxes, and net proceeds.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleDownloadCsv()}
            data-testid="export-all-csv-btn"
          >
            <FileSpreadsheet className="mr-1.5 h-4 w-4" />
            Export All (CSV)
          </Button>
        </div>
      </div>

      {authError && (
        <div
          className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive"
          data-testid="statement-auth-error"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{authError}</span>
        </div>
      )}

      {/* Statements Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period / Statement</TableHead>
                <TableHead>Snapshot Share</TableHead>
                <TableHead>Gross</TableHead>
                <TableHead>Protocol Fee (2%)</TableHead>
                <TableHead>Tax (15%)</TableHead>
                <TableHead>Net Payout</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statements.map((stmt) => (
                <TableRow key={stmt.statementId} data-testid={`statement-row-${stmt.statementId}`}>
                  <TableCell className="font-medium">
                    <div>{stmt.period.quarterLabel}</div>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {stmt.statementId}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold">{stmt.snapshotSharePercent.toFixed(2)}%</div>
                    <div className="text-[11px] text-muted-foreground">
                      {stmt.heldKeys} of {stmt.snapshotTotalSupply} keys
                    </div>
                  </TableCell>
                  <TableCell>
                    {stmt.grossAmount.toLocaleString()} {stmt.currency}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    -{stmt.protocolFeeAmount.toLocaleString()} {stmt.currency}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    -{stmt.withholdingTaxAmount.toLocaleString()} {stmt.currency}
                  </TableCell>
                  <TableCell className="font-semibold text-emerald-600">
                    {stmt.netPayoutAmount.toLocaleString()} {stmt.currency}
                  </TableCell>
                  <TableCell>
                    {stmt.isEstimated ? (
                      <Badge variant="secondary" className="text-xs" data-testid="badge-estimated">
                        <Clock className="mr-1 h-3 w-3" />
                        Estimated
                      </Badge>
                    ) : (
                      <Badge variant="default" className="bg-emerald-600 text-xs" data-testid="badge-final">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Final
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedStatement(stmt)}
                        data-testid={`view-statement-${stmt.statementId}`}
                      >
                        Details
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownloadCsv(stmt)}
                        aria-label={`Download CSV for ${stmt.statementId}`}
                        data-testid={`download-csv-${stmt.statementId}`}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Statement Detail Breakdown Modal */}
      {selectedStatement && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          data-testid="statement-detail-modal"
        >
          <Card className="w-full max-w-lg">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Accounting Statement
                    </p>
                    {selectedStatement.isEstimated ? (
                      <Badge variant="secondary" className="text-xs">
                        Estimated
                      </Badge>
                    ) : (
                      <Badge variant="default" className="bg-emerald-600 text-xs">
                        Finalized
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-xl font-semibold">
                    {selectedStatement.period.quarterLabel}
                  </h2>
                  <p className="font-mono text-xs text-muted-foreground">
                    ID: {selectedStatement.statementId}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedStatement(null)}
                  aria-label="Close statement details"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border p-3 text-xs space-y-1.5 bg-muted/40">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Key Title:</span>
                  <span className="font-medium">{selectedStatement.keyTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Snapshot Date:</span>
                  <span>{new Date(selectedStatement.snapshotDate).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Snapshot Block Height:</span>
                  <span className="font-mono">{selectedStatement.snapshotBlockHeight}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Snapshot Balance:</span>
                  <span>
                    <strong>{selectedStatement.heldKeys}</strong> / {selectedStatement.snapshotTotalSupply} keys (
                    {selectedStatement.snapshotSharePercent.toFixed(2)}%)
                  </span>
                </div>
              </div>

              {/* Financial Reconciliation */}
              <div className="space-y-2 border-t pt-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Pool Distribution:</span>
                  <span>{selectedStatement.poolGrossDistribution.toLocaleString()} {selectedStatement.currency}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Gross Share:</span>
                  <span>{selectedStatement.grossAmount.toLocaleString()} {selectedStatement.currency}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Protocol Fee ({selectedStatement.protocolFeeRate * 100}%):</span>
                  <span>-{selectedStatement.protocolFeeAmount.toLocaleString()} {selectedStatement.currency}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Withholding Tax ({selectedStatement.withholdingTaxRate * 100}%):</span>
                  <span>-{selectedStatement.withholdingTaxAmount.toLocaleString()} {selectedStatement.currency}</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-base font-bold text-emerald-600">
                  <span>Net Payout:</span>
                  <span>{selectedStatement.netPayoutAmount.toLocaleString()} {selectedStatement.currency}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePrintPdf(selectedStatement)}
                  data-testid="print-statement-btn"
                >
                  <FileText className="mr-1.5 h-4 w-4" />
                  Print / PDF
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleDownloadCsv(selectedStatement)}
                  data-testid="download-statement-csv-btn"
                >
                  <Download className="mr-1.5 h-4 w-4" />
                  Download CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
