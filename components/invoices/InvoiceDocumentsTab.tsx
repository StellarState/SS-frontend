"use client";

/**
 * Documents tab (issue #376)
 *
 * Renders the invoice's supporting documents straight from IPFS. PDFs and
 * images are shown inline; anything else is offered as a download. IPFS
 * gateways are unreliable, so a document that fails on the first gateway is
 * retried against the next one before the user is shown an error.
 */

import { useEffect, useState } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { Archive, Download, ExternalLink, FileText, FileWarning, Image as ImageIcon, LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentVerificationBadge } from "@/components/invoices/DocumentVerificationBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InvoiceDocumentExpiryAlert } from "@/components/invoices/InvoiceDocumentExpiryAlert";
import { DocumentRenewalModal } from "@/components/invoices/DocumentRenewalModal";
import { Badge } from "@/components/ui/badge";
import {
  calculateDocumentExpiry,
  loadDocumentMetadata,
  saveDocumentMetadata,
  type DocumentExpiryMetadata,
} from "@/lib/invoiceDocumentExpiry";
import {
  documentFileName,
  guessDocumentKind,
  ipfsGatewayCandidates,
  isIpfsReference,
  type DocumentKind,
} from "@/lib/ipfs";
import {
  createStoredZip,
  fetchVerifiedIpfsDocument,
  invoiceDocumentFileName,
  type DocumentDownloadProgress,
  type ZipEntry,
} from "@/lib/invoiceDocumentDownloads";

function saveBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB"];
  let size = value / 1024;
  let unit = units[0];
  for (let index = 1; size >= 1024 && index < units.length; index++) {
    size /= 1024;
    unit = units[index];
  }
  return `${size.toFixed(1)} ${unit}`;
}

function DownloadProgress({
  label,
  progress,
  testId,
}: {
  label: string;
  progress: DocumentDownloadProgress | null;
  testId: string;
}) {
  return (
    <div className="min-w-0 flex-1" role="status" aria-live="polite" data-testid={testId}>
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      {progress && (
        <div className="mt-1 flex items-center gap-2">
          <progress
            className="h-2 min-w-0 flex-1 accent-primary"
            value={progress.total ? Math.min(progress.loaded, progress.total) : undefined}
            max={progress.total ?? undefined}
            aria-label="Download progress"
          />
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {formatBytes(progress.loaded)}
            {progress.total ? ` / ${formatBytes(progress.total)}` : ""}
          </span>
        </div>
      )}
    </div>
  );
}

function InvoiceDocumentDownload({
  invoiceId,
  documentUrl,
  filename: providedFilename,
}: {
  invoiceId: string;
  documentUrl: string;
  filename?: string;
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState<DocumentDownloadProgress | null>(null);
  const [error, setError] = useState("");
  const filename = providedFilename || invoiceDocumentFileName(invoiceId, documentUrl);

  async function download() {
    setIsDownloading(true);
    setStatus("Verifying document CID…");
    setProgress(null);
    setError("");
    try {
      const bytes = await fetchVerifiedIpfsDocument(documentUrl, (nextProgress) => {
        setStatus("Downloading document…");
        setProgress(nextProgress);
      });
      setStatus("Preparing verified document…");
      saveBlob(new Blob([bytes.slice().buffer as ArrayBuffer]), filename);
      setStatus("");
    } catch (downloadError) {
      setStatus("");
      setError(downloadError instanceof Error ? downloadError.message : "Download failed.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
      {isDownloading && (
        <DownloadProgress label={status} progress={progress} testId="document-download-progress" />
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={download}
        disabled={isDownloading}
        aria-label={`Download ${providedFilename || documentFileName(documentUrl)}`}
        data-testid="document-download-button"
      >
        {isDownloading ? <LoaderCircle className="animate-spin" /> : <Download />}
        {isDownloading ? "Downloading" : "Download"}
      </Button>
      {error && <p className="basis-full text-right text-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}

function InvoiceBulkExport({
  invoiceId,
  documents,
}: {
  invoiceId: string;
  documents: string[];
}) {
  const [isExporting, setIsExporting] = useState(false);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState<DocumentDownloadProgress | null>(null);
  const [error, setError] = useState("");

  async function exportDocuments() {
    setIsExporting(true);
    setStatus(`Verifying document 1 of ${documents.length}…`);
    setProgress(null);
    setError("");
    try {
      const folder = `invoice-${invoiceId.replace(/[^a-zA-Z0-9_-]+/g, "-")}_documents`;
      const entries: ZipEntry[] = [];
      for (const [index, reference] of documents.entries()) {
        setStatus(`Verifying document ${index + 1} of ${documents.length}…`);
        const bytes = await fetchVerifiedIpfsDocument(reference, (nextProgress) => {
          setStatus(`Downloading document ${index + 1} of ${documents.length}…`);
          setProgress(nextProgress);
        });
        entries.push({
          path: `${folder}/${invoiceDocumentFileName(invoiceId, reference)}`,
          data: bytes,
        });
        setProgress(null);
      }
      setStatus("Preparing ZIP archive…");
      saveBlob(createStoredZip(entries), `${folder}.zip`);
      setStatus("");
    } catch (exportError) {
      setStatus("");
      setError(exportError instanceof Error ? exportError.message : "Export failed.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {isExporting && (
        <DownloadProgress label={status} progress={progress} testId="document-bulk-progress" />
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={exportDocuments}
        disabled={isExporting}
        data-testid="document-bulk-export-button"
      >
        {isExporting ? <LoaderCircle className="animate-spin" /> : <Archive />}
        {isExporting ? "Exporting" : "Download all"}
      </Button>
      {error && <p className="basis-full text-right text-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}

function kindIcon(kind: DocumentKind) {
  return kind === "image" ? ImageIcon : kind === "pdf" ? FileText : FileWarning;
}

/**
 * Inline viewer. Images are rendered without optimization so IPFS gateway URLs
 * remain directly accessible.
 */
function DocumentViewer({
  url,
  kind,
  name,
  onRenderError,
}: {
  url: string;
  kind: DocumentKind;
  name: string;
  onRenderError: () => void;
}) {
  if (kind === "image") {
    return (
      <Image
        src={url}
        alt={name}
        width={1200}
        height={800}
        unoptimized
        sizes="100vw"
        data-testid="document-inline-image"
        onError={onRenderError}
        className="max-h-[70vh] w-full rounded-lg border object-contain"
      />
    );
  }

  if (kind === "pdf") {
    return (
      <object
        data={url}
        type="application/pdf"
        data-testid="document-inline-pdf"
        className="h-[70vh] w-full rounded-lg border"
      >
        {/* Shown by the browser when it cannot render a PDF inline. */}
        <p className="p-6 text-center text-sm text-muted-foreground">
          Your browser cannot display this PDF inline.{" "}
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
            Open it in a new tab
          </a>
          .
        </p>
      </object>
    );
  }

  return (
    <div
      className="rounded-lg border border-dashed p-10 text-center"
      data-testid="document-no-inline-viewer"
    >
      <FileWarning className="mx-auto h-8 w-8 text-muted-foreground" />
      <p className="mt-2 text-sm font-medium">{name}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        This file type cannot be previewed in the browser.
      </p>
      <Button asChild className="mt-4">
        <a href={url} target="_blank" rel="noopener noreferrer" data-testid="document-download-link">
          <ExternalLink />
          Open document
        </a>
      </Button>
    </div>
  );
}

export interface SupportingDocument { cid: string; type?: string; file_name?: string; size?: number; }

function IpfsDocumentPanel({
  documentUrl,
  invoiceId,
  document,
  meta,
  onRenew,
}: {
  documentUrl: string;
  invoiceId: string;
  document?: SupportingDocument;
  meta?: DocumentExpiryMetadata;
  onRenew?: (updated: DocumentExpiryMetadata) => void;
}) {
  const candidates = ipfsGatewayCandidates(documentUrl);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [localMeta, setLocalMeta] = useState<DocumentExpiryMetadata | null>(() => {
    return meta ?? loadDocumentMetadata(invoiceId, documentUrl) ?? {
      id: `doc-${encodeURIComponent(documentUrl)}`,
      invoiceId,
      documentUrl,
      name: document?.file_name || documentFileName(documentUrl),
      isMandatory: true,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      gracePeriodDays: 7,
      remindersSent: [],
      auditHistory: [
        {
          id: `audit-init-${Date.now()}`,
          action: "uploaded",
          timestamp: new Date().toISOString(),
          actor: "issuer",
          notes: "Initial document attachment",
        },
      ],
    };
  });

  const effectiveMeta = meta ?? localMeta;
  const expiryStatus = effectiveMeta ? calculateDocumentExpiry(effectiveMeta) : null;

  // A new document resets the retry state.
  useEffect(() => {
    setCandidateIndex(0);
    setFailed(false);
  }, [documentUrl]);

  // ipfs:// and bare CIDs are recorded by some issuers, so they have to be
  // verified as reachable before claiming the document is missing.
  const { data: documentUrlAvailable, isLoading, isError, isFetching, error } = useQuery({
    queryKey: ["ipfs-document", documentUrl, candidateIndex],
    queryFn: async () => {
      const url = candidates[candidateIndex];
      const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(15_000) });
      if (!res.ok) throw new Error(`Document unavailable (${res.status})`);
      return { url, size: Number(res.headers.get("content-length")) || null };
    },
    enabled: candidates.length > 0,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  if (candidates.length === 0) {
    return <p className="text-sm text-muted-foreground">No document attached</p>;
  }

  if (isLoading || isFetching) {
    return <Skeleton className="h-72 w-full" data-testid="document-loading" />;
  }

  if (isError || failed) {
    const hasAnotherGateway = candidateIndex + 1 < candidates.length;
    return (
      <div
        className="rounded-lg border border-dashed p-8 text-center"
        data-testid="document-unavailable"
      >
        <FileWarning className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm font-medium">{error instanceof DOMException && error.name === "TimeoutError" ? "Document request timed out" : "Document could not be loaded"}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {error instanceof DOMException && error.name === "TimeoutError" ? "The gateway took too long to respond. Try another gateway or retry later." : "The file is stored on IPFS and may be temporarily unreachable."}
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          {hasAnotherGateway && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFailed(false);
                setCandidateIndex((index) => index + 1);
              }}
              data-testid="document-retry-gateway"
            >
              <RefreshCw />
              Try another gateway
            </Button>
          )}
          <Button asChild variant="ghost" size="sm">
            <a
              href={candidates[candidateIndex]}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink />
              Open directly
            </a>
          </Button>
        </div>
      </div>
    );
  }

  const url = candidates[candidateIndex];
  const name = document?.file_name || documentFileName(documentUrl);
  const kind = guessDocumentKind(documentUrl);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-2 text-sm font-medium" data-testid="document-name">
          {(() => {
            const Icon = kindIcon(kind);
            return <Icon className="h-4 w-4 shrink-0" />;
          })()}
          <span className="truncate">{name}</span>
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <InvoiceDocumentDownload invoiceId={invoiceId} documentUrl={documentUrl} filename={document?.file_name} />
          <Button asChild variant="ghost" size="sm">
            <a href={url} target="_blank" rel="noopener noreferrer" data-testid="document-open-external">
              <ExternalLink />
              Open
            </a>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground" data-testid="document-metadata">
        <span>{document?.type || (kind === "pdf" ? "PDF" : kind)}</span>
        {(document?.size ?? documentUrlAvailable?.size) != null && <span>{formatBytes(document?.size ?? documentUrlAvailable!.size!)}</span>}
      </div>

      {isIpfsReference(documentUrl) && (
        <p className="text-xs text-muted-foreground" data-testid="document-ipfs-source">
          Stored on IPFS
        </p>
      )}

      {/* Integrity check runs in the background and never blocks the viewer (#412). */}
      <DocumentVerificationBadge documentUrl={documentUrl} />

      {/* Expiry metadata, countdown, and renewal flow (#658) */}
      {effectiveMeta && expiryStatus && (
        <div
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/20 px-3 py-2 text-xs"
          data-testid="document-expiry-bar"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-foreground" data-testid="doc-expiry-date">
              Expires: {new Date(effectiveMeta.expiresAt).toLocaleDateString()}
            </span>
            <Badge
              variant={
                expiryStatus.status === "active"
                  ? "outline"
                  : expiryStatus.status === "expiring_soon"
                  ? "secondary"
                  : "destructive"
              }
              data-testid="doc-status-badge"
            >
              {expiryStatus.status.replace(/_/g, " ").toUpperCase()}
            </Badge>
            <span className="text-muted-foreground">{expiryStatus.explanation}</span>
          </div>
          <DocumentRenewalModal
            meta={effectiveMeta}
            onRenew={(updated) => {
              setLocalMeta(updated);
              saveDocumentMetadata(updated);
              onRenew?.(updated);
            }}
          />
        </div>
      )}

      {kind === "pdf" ? (
        <>
          <Button type="button" onClick={() => setViewerOpen(true)} data-testid="document-view-button">
            View PDF
          </Button>
          <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
            <DialogContent className="max-w-5xl" data-testid="document-viewer-modal">
              <DialogHeader>
                <DialogTitle>{name}</DialogTitle>
              </DialogHeader>
              <DocumentViewer
                url={url}
                kind={kind}
                name={name}
                onRenderError={() => setFailed(true)}
              />
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <DocumentViewer
          url={url}
          kind={kind}
          name={name}
          onRenderError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

interface InvoiceDocumentsTabProps {
  invoiceId: string;
  /** Primary document, as returned by the API. */
  documentUrl: string | null;
  /** Any additional supporting documents the issuer attached. */
  additionalDocuments?: Array<string | SupportingDocument>;
  /** Optional expiry metadata for documents (#658). */
  documentsMetadata?: DocumentExpiryMetadata[];
}

/**
 * Tabbed document viewer. With a single document the tab bar is hidden and
 * the document is shown directly, which is the common case.
 */
export function InvoiceDocumentsTab({
  invoiceId,
  documentUrl,
  additionalDocuments = [],
  documentsMetadata = [],
}: InvoiceDocumentsTabProps) {
  const extras: SupportingDocument[] = additionalDocuments.map((item) => typeof item === "string" ? { cid: item } : item).filter((item) => Boolean(item.cid));
  const primary: SupportingDocument | null = documentUrl ? { cid: documentUrl } : null;
  const documents = [...(primary ? [primary] : []), ...extras];

  const allMeta = documents.map((doc) => {
    const existing = documentsMetadata.find((m) => m.documentUrl === doc.cid);
    return (
      existing ??
      loadDocumentMetadata(invoiceId, doc.cid) ?? {
        id: `doc-${encodeURIComponent(doc.cid)}`,
        invoiceId,
        documentUrl: doc.cid,
        name: doc.file_name || documentFileName(doc.cid),
        isMandatory: true,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        gracePeriodDays: 7,
        remindersSent: [],
        auditHistory: [
          {
            id: `audit-${Date.now()}`,
            action: "uploaded" as const,
            timestamp: new Date().toISOString(),
            actor: "issuer",
            notes: "Initial document attachment",
          },
        ],
      }
    );
  });

  if (!primary && extras.length === 0) {
    return (
      <Card data-testid="invoice-documents">
        <CardHeader>
          <h2 className="text-lg font-semibold">Documents</h2>
        </CardHeader>
        <CardContent>
          <p className="py-6 text-center text-sm text-muted-foreground" data-testid="documents-empty">
            No documents have been attached to this invoice.
          </p>
        </CardContent>
      </Card>
    );
  }

  const sectionHeader = (
    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">Documents</h2>
      <InvoiceBulkExport invoiceId={invoiceId} documents={documents.map((document) => document.cid)} />
    </CardHeader>
  );

  if (documents.length === 1 && primary) {
    return (
      <Card data-testid="invoice-documents">
        {sectionHeader}
        <CardContent className="space-y-4">
          <InvoiceDocumentExpiryAlert documents={allMeta} />
          <IpfsDocumentPanel
            documentUrl={primary.cid}
            invoiceId={invoiceId}
            document={primary}
            meta={allMeta.find((m) => m.documentUrl === primary.cid)}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="invoice-documents">
      {sectionHeader}
      <CardContent className="space-y-4">
        <InvoiceDocumentExpiryAlert documents={allMeta} />
        <Tabs defaultValue={primary?.cid ?? documents[0].cid}>
          <TabsList>
            {documents.map((document) => (
              <TabsTrigger key={document.cid} value={document.cid}>
                {document.file_name || documentFileName(document.cid)}
              </TabsTrigger>
            ))}
          </TabsList>
          {documents.map((document) => (
            <TabsContent key={document.cid} value={document.cid} className="mt-4">
              <IpfsDocumentPanel
                documentUrl={document.cid}
                invoiceId={invoiceId}
                document={document}
                meta={allMeta.find((m) => m.documentUrl === document.cid)}
              />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
