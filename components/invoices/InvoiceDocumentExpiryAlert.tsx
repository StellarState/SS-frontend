"use client";

import { AlertTriangle, Clock, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  calculateDocumentExpiry,
  type DocumentExpiryMetadata,
} from "@/lib/invoiceDocumentExpiry";

interface InvoiceDocumentExpiryAlertProps {
  documents: DocumentExpiryMetadata[];
  now?: Date;
  className?: string;
}

export function InvoiceDocumentExpiryAlert({
  documents,
  now = new Date(),
  className,
}: InvoiceDocumentExpiryAlertProps) {
  const atRiskDocs = documents
    .map((doc) => ({
      doc,
      result: calculateDocumentExpiry(doc, now),
    }))
    .filter(({ result }) => result.status !== "active" && result.status !== "renewed");

  if (atRiskDocs.length === 0) return null;

  const hasBlockedFunding = atRiskDocs.some(
    ({ doc, result }) => doc.isMandatory && !result.canFund,
  );

  return (
    <div className={className} data-testid="document-expiry-alerts">
      {hasBlockedFunding ? (
        <Alert variant="destructive" className="mb-4" data-testid="funding-blocked-alert">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle className="font-bold">Funding Paused: Mandatory Document Expired</AlertTitle>
          <AlertDescription className="mt-1 space-y-1 text-sm">
            <p>
              Funding on this invoice is paused because one or more mandatory legal/supporting
              documents have expired.
            </p>
            <ul className="list-disc pl-5">
              {atRiskDocs
                .filter(({ doc, result }) => doc.isMandatory && !result.canFund)
                .map(({ doc, result }) => (
                  <li key={doc.id}>
                    <strong>{doc.name}</strong>: {result.explanation}
                  </li>
                ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="mb-4 border-amber-500 bg-amber-50/50 text-amber-900 dark:border-amber-600 dark:bg-amber-950/20 dark:text-amber-200" data-testid="document-warning-alert">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="font-semibold flex items-center gap-1.5">
            <Clock className="h-4 w-4" /> Supporting Document Expiry Warning
          </AlertTitle>
          <AlertDescription className="mt-1 text-sm">
            <ul className="list-disc pl-5 space-y-0.5">
              {atRiskDocs.map(({ doc, result }) => (
                <li key={doc.id}>
                  <strong>{doc.name}</strong>: {result.explanation}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
