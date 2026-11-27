"use client";

import { useState } from "react";
import {
  useAgreement,
  CURRENT_TERMS_VERSION,
  CURRENT_TERMS_CONTENT,
} from "@/hooks/useAgreement";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AlertCircle, CheckCircle2, Download } from "lucide-react";

interface AgreementReviewContentProps {
  onAccepted?: () => void;
  onCancel?: () => void;
  version?: string;
  isEmbedded?: boolean;
}

export function AgreementReviewContent({
  onAccepted,
  onCancel,
  version = CURRENT_TERMS_VERSION,
  isEmbedded = false,
}: AgreementReviewContentProps) {
  const { acceptAgreement, downloadAgreement } = useAgreement(version);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [agreedCheckbox, setAgreedCheckbox] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 25;
    if (isAtBottom && !scrolledToEnd) {
      setScrolledToEnd(true);
    }
  };

  const handleAccept = () => {
    if (!scrolledToEnd && !agreedCheckbox) {
      setError("Please scroll to the bottom of the agreement and check the confirmation.");
      return;
    }
    setError(null);
    acceptAgreement(version);
    onAccepted?.();
  };

  return (
    <div className="space-y-4 text-sm" data-testid="agreement-content">
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Terms Version {version}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => downloadAgreement(version)}
            className="h-7 text-xs text-muted-foreground gap-1 hover:text-foreground"
            data-testid="download-terms-button"
          >
            <Download className="h-3.5 w-3.5" />
            Download Copy
          </Button>
        </div>
        <h3 className="text-base font-semibold text-foreground">
          {CURRENT_TERMS_CONTENT.title}
        </h3>
        <p className="text-xs text-muted-foreground">
          Effective date: {CURRENT_TERMS_CONTENT.effectiveDate}. Please review the entire agreement before proceeding.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-md bg-destructive/15 p-2.5 text-xs text-destructive font-medium flex items-center gap-2"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Scrollable Terms Container */}
      <div
        data-testid="agreement-scroll-container"
        onScroll={handleScroll}
        className="max-h-64 overflow-y-auto rounded-md border border-border bg-muted/30 p-4 space-y-4 text-xs text-muted-foreground leading-relaxed"
        tabIndex={0}
        aria-label="Investment agreement terms text"
      >
        <p className="font-semibold text-foreground">
          IMPORTANT NOTICE: INVESTING IN RECEIVABLES AND INVOICE-BACKED TOKENS INVOLVES RISK OF LOSS.
        </p>
        {CURRENT_TERMS_CONTENT.sections.map((sec, idx) => (
          <div key={idx} className="space-y-1.5">
            <h4 className="font-medium text-foreground">{sec.heading}</h4>
            <p>{sec.body}</p>
          </div>
        ))}
        <div className="pt-2 border-t border-border/60 text-foreground font-medium text-center">
          — End of Agreement (v{version}) —
        </div>
      </div>

      {/* Scroll indicator banner */}
      <div className="flex items-center gap-2 text-xs">
        {scrolledToEnd ? (
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium" data-testid="scroll-status-complete">
            <CheckCircle2 className="h-4 w-4" />
            <span>You have reviewed the terms to the bottom.</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400" data-testid="scroll-status-pending">
            <AlertCircle className="h-4 w-4" />
            <span>Please scroll to the bottom of the terms container to enable acceptance.</span>
          </div>
        )}
      </div>

      <div className="pt-1">
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            id="agreement-ack-checkbox"
            checked={agreedCheckbox}
            onChange={(e) => setAgreedCheckbox(e.target.checked)}
            className="h-4 w-4 mt-0.5 rounded border-muted-foreground/40 text-primary focus:ring-primary"
            data-testid="agreement-ack-checkbox"
          />
          <span className="text-xs text-muted-foreground leading-snug">
            I confirm that I have read, understood, and agree to be bound by the StellarState Master Investor & Invoice Participation Agreement (v{version}).
          </span>
        </label>
      </div>

      <div className="flex justify-between items-center pt-2">
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          className="ml-auto"
          disabled={!scrolledToEnd || !agreedCheckbox}
          onClick={handleAccept}
          data-testid="accept-agreement-btn"
        >
          Accept & Continue
        </Button>
      </div>
    </div>
  );
}

interface AgreementModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onAccepted?: () => void;
  version?: string;
  trigger?: React.ReactNode;
}

export function AgreementModal({
  open,
  onOpenChange,
  onAccepted,
  version = CURRENT_TERMS_VERSION,
  trigger,
}: AgreementModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const handleAccepted = () => {
    setOpen(false);
    onAccepted?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger}
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto" data-testid="agreement-modal-dialog">
        <DialogHeader>
          <DialogTitle>Investment Agreement Review</DialogTitle>
          <DialogDescription>
            You must review and accept the current investment agreement before funding invoices.
          </DialogDescription>
        </DialogHeader>
        <AgreementReviewContent
          version={version}
          onAccepted={handleAccepted}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
