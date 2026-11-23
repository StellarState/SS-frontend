"use client";

import { useState } from "react";
import { History, RefreshCw } from "lucide-react";
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
  renewDocumentRecord,
  type DocumentExpiryMetadata,
} from "@/lib/invoiceDocumentExpiry";

interface DocumentRenewalModalProps {
  meta: DocumentExpiryMetadata;
  userAddress?: string;
  onRenew: (updated: DocumentExpiryMetadata) => void;
  trigger?: React.ReactNode;
}

export function DocumentRenewalModal({
  meta,
  userAddress = "issuer_wallet",
  onRenew,
  trigger,
}: DocumentRenewalModalProps) {
  const [open, setOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newExpiry, setNewExpiry] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) {
      setError("Document URL or IPFS CID is required.");
      return;
    }
    if (!newExpiry) {
      setError("New expiry date is required.");
      return;
    }
    if (new Date(newExpiry).getTime() <= Date.now()) {
      setError("New expiry date must be in the future.");
      return;
    }

    const updated = renewDocumentRecord(
      meta,
      newUrl.trim(),
      new Date(newExpiry).toISOString(),
      userAddress,
      notes.trim() || undefined,
    );

    onRenew(updated);
    setOpen(false);
    setNewUrl("");
    setNewExpiry("");
    setNotes("");
    setError("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            data-testid={`renew-doc-${meta.id}`}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Renew Document
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Renew Supporting Document</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="gap-1 text-xs"
              data-testid="toggle-audit-history"
            >
              <History className="h-3.5 w-3.5" />
              {showHistory ? "Hide History" : "Audit History"}
            </Button>
          </DialogTitle>
          <DialogDescription>
            Submit an updated document to replace <strong>{meta.name}</strong>. All prior document
            versions and audit records are preserved.
          </DialogDescription>
        </DialogHeader>

        {showHistory ? (
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1" data-testid="audit-history-list">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase">
              Audit Trail ({meta.auditHistory.length} events)
            </h4>
            {meta.auditHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No prior history recorded.</p>
            ) : (
              <div className="space-y-2">
                {meta.auditHistory.map((item) => (
                  <div
                    key={item.id}
                    className="rounded border p-2.5 text-xs space-y-1 bg-muted/30"
                    data-testid="audit-record-item"
                  >
                    <div className="flex items-center justify-between font-mono">
                      <span className="font-semibold uppercase text-primary">{item.action}</span>
                      <span className="text-muted-foreground">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-muted-foreground">By: {item.actor}</p>
                    {item.notes && <p className="italic">{item.notes}</p>}
                    {item.previousDocumentUrl && (
                      <p className="truncate text-[11px] text-muted-foreground">
                        Prev: {item.previousDocumentUrl}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-xs text-destructive font-medium" role="alert">
                {error}
              </p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="doc-url">New Document URL or IPFS CID *</Label>
              <Input
                id="doc-url"
                data-testid="renew-doc-url"
                placeholder="ipfs://bafy... or https://..."
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doc-expiry">New Expiry Date *</Label>
              <Input
                id="doc-expiry"
                data-testid="renew-doc-expiry"
                type="date"
                value={newExpiry}
                onChange={(e) => setNewExpiry(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doc-notes">Renewal Notes (Optional)</Label>
              <Input
                id="doc-notes"
                data-testid="renew-doc-notes"
                placeholder="Reason or update details"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" data-testid="submit-renewal-btn">
                Confirm Renewal
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
