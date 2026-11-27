"use client";

import { useAgreement, CURRENT_TERMS_VERSION } from "@/hooks/useAgreement";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { AgreementModal } from "@/components/invoices/AgreementModal";
import { FileText, Download, CheckCircle2, ShieldCheck, AlertCircle } from "lucide-react";
import { useState } from "react";

export function AcceptedAgreementsSection() {
  const {
    acceptedAgreements,
    currentVersion,
    hasAcceptedCurrentVersion,
    downloadAgreement,
    reload,
  } = useAgreement();

  const [modalOpen, setModalOpen] = useState(false);

  return (
    <Card data-testid="accepted-agreements-section">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Accepted Investment Agreements
            </CardTitle>
            <CardDescription>
              Review historical terms accepted for your account and download legal documentation.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {!hasAcceptedCurrentVersion && (
              <Button
                size="sm"
                variant="default"
                onClick={() => setModalOpen(true)}
                data-testid="review-current-terms-btn"
              >
                Review Current Terms (v{currentVersion})
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current status pill */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border text-xs">
          <div className="flex items-center gap-2">
            {hasAcceptedCurrentVersion ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            )}
            <span className="font-medium text-foreground">
              Current Platform Terms: <span className="font-mono">v{currentVersion}</span>
            </span>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider ${
              hasAcceptedCurrentVersion
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
            }`}
          >
            {hasAcceptedCurrentVersion ? "Accepted & Active" : "Pending Acceptance"}
          </span>
        </div>

        {/* Accepted versions list */}
        {acceptedAgreements.length === 0 ? (
          <div
            className="text-center py-6 px-4 border border-dashed rounded-lg text-muted-foreground text-sm space-y-2"
            data-testid="no-agreements-message"
          >
            <FileText className="h-8 w-8 mx-auto text-muted-foreground/60" />
            <p className="font-medium">No investment agreements accepted yet.</p>
            <p className="text-xs text-muted-foreground">
              When you fund an invoice, your agreement acceptance will be permanently recorded here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border border rounded-lg overflow-hidden" data-testid="agreements-list">
            {acceptedAgreements.map((agreement) => (
              <div
                key={agreement.version}
                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-background hover:bg-muted/30 transition-colors"
                data-testid={`agreement-row-${agreement.version}`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">
                      Terms Version {agreement.version}
                    </span>
                    {agreement.version === currentVersion && (
                      <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary text-[10px] font-semibold">
                        CURRENT
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground font-mono text-[11px]">
                    Confirmation: {agreement.confirmationId}
                  </p>
                  <p className="text-muted-foreground">
                    Accepted on: {new Date(agreement.acceptedAt).toLocaleString()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadAgreement(agreement)}
                  className="gap-1.5 text-xs h-8 shrink-0"
                  data-testid={`download-agreement-${agreement.version}`}
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Legal Copy
                </Button>
              </div>
            ))}
          </div>
        )}

        <AgreementModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          onAccepted={() => {
            reload();
            setModalOpen(false);
          }}
        />
      </CardContent>
    </Card>
  );
}
