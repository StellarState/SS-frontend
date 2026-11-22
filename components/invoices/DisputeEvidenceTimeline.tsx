"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Clock,
  FileText,
  Lock,
  ShieldAlert,
  ShieldCheck,
  UploadCloud,
  CheckCircle2,
  FileCheck2,
  Eye,
  KeyRound,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  useDisputeTimeline,
  type UseDisputeTimelineOptions,
} from "@/hooks/useDisputeTimeline";
import type {
  DisputeEvidenceType,
  DisputeEvidenceVisibility,
  DisputeParticipantRole,
} from "@/lib/analytics/disputeTimeline";

export interface DisputeEvidenceTimelineProps {
  invoiceId: string;
  options?: Omit<UseDisputeTimelineOptions, "invoiceId">;
}

export function DisputeEvidenceTimeline({ invoiceId, options }: DisputeEvidenceTimelineProps) {
  const {
    dispute,
    timeline,
    evidence,
    sla,
    requiredAction,
    approvedPublicStatus,
    isEvidenceLocked,
    canSubmitEvidence,
    activeRole,
    setActiveRole,
    submitEvidence,
    isSubmitting,
    startAdjudication,
    isAdjudicating,
  } = useDisputeTimeline({ invoiceId, ...options });

  // Submission Form State
  const [evidenceType, setEvidenceType] = useState<DisputeEvidenceType>("text");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<DisputeEvidenceVisibility>("public");

  // File upload state
  const [fileName, setFileName] = useState("");
  const [fileHash, setFileHash] = useState("");

  // Attestation state
  const [signerAddress, setSignerAddress] = useState("");
  const [signatureHash, setSignatureHash] = useState("");

  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError("Please enter a title for the evidence.");
      return;
    }
    if (!content.trim()) {
      setFormError("Please enter the detailed evidence statement or notes.");
      return;
    }

    try {
      setFormError(null);
      await submitEvidence({
        authorRole: activeRole,
        authorAddress:
          activeRole === "issuer"
            ? dispute.issuerAddress
            : activeRole === "debtor"
              ? dispute.debtorAddress
              : dispute.arbitratorAddress ?? "G_ARBITRATOR",
        evidenceType,
        title: title.trim(),
        content: content.trim(),
        visibility,
        fileMetadata:
          evidenceType === "upload"
            ? {
                fileName: fileName.trim() || "document.pdf",
                fileHash: fileHash.trim() || `0x${Math.random().toString(16).slice(2, 10)}`,
                fileSize: 102400,
              }
            : undefined,
        attestationMetadata:
          evidenceType === "attestation"
            ? {
                signerAddress: signerAddress.trim() || "GORACLE_ATTESTOR",
                signatureHash: signatureHash.trim() || `0x${Math.random().toString(16).slice(2, 14)}`,
                attestedAt: new Date().toISOString(),
              }
            : undefined,
      });

      // Reset form
      setTitle("");
      setContent("");
      setFileName("");
      setFileHash("");
      setSignerAddress("");
      setSignatureHash("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to submit evidence");
    }
  };

  const handleStartAdjudication = async () => {
    if (!dispute.arbitratorAddress) return;
    await startAdjudication(dispute.arbitratorAddress);
  };

  return (
    <div className="space-y-6" data-testid="dispute-evidence-timeline">
      {/* Header and Status */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight">Invoice Dispute Evidence Timeline</h2>
            <Badge
              variant={
                dispute.status === "open"
                  ? "outline"
                  : dispute.status === "under_adjudication"
                    ? "default"
                    : "secondary"
              }
              className={
                dispute.status === "open"
                  ? "border-amber-500 text-amber-600"
                  : dispute.status === "under_adjudication"
                    ? "bg-purple-600 text-white"
                    : ""
              }
              data-testid="dispute-status-badge"
            >
              {dispute.status.replace("_", " ").toUpperCase()}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Disputed Amount:{" "}
            <span className="font-semibold text-foreground">
              ${dispute.disputedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>{" "}
            • Invoice: {dispute.invoiceTitle}
          </p>
        </div>

        {/* Role Selector for testing & simulation */}
        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-2 text-xs">
          <span className="text-muted-foreground font-medium">Viewing as:</span>
          <select
            value={activeRole}
            onChange={(e) => setActiveRole(e.target.value as DisputeParticipantRole)}
            className="rounded border bg-background px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
            data-testid="role-selector"
            aria-label="Dispute Role View"
          >
            <option value="issuer">Issuer (Seller)</option>
            <option value="debtor">Debtor (Buyer)</option>
            <option value="arbitrator">Arbitrator (Adjudicator)</option>
            <option value="public">Public Observer / Investor</option>
          </select>
        </div>
      </div>

      {/* Public Approved Status Card */}
      <Card className="border-l-4 border-l-primary bg-muted/30">
        <CardContent className="py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">Approved Public Status:</span>
            <span className="text-sm font-semibold" data-testid="public-status-text">
              {approvedPublicStatus}
            </span>
          </div>
          <Badge variant="outline" className="text-xs">
            Role: {activeRole.toUpperCase()}
          </Badge>
        </CardContent>
      </Card>

      {/* SLA and Action Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* SLA Age Card */}
        <Card data-testid="sla-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">SLA Resolution Countdown</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold" data-testid="sla-age-display">
                {sla.slaAgeDisplay}
              </span>
              <span
                className={`text-xs font-semibold ${
                  sla.isBreached
                    ? "text-destructive"
                    : sla.remainingHours <= 24
                      ? "text-amber-600"
                      : "text-muted-foreground"
                }`}
                data-testid="sla-remaining-display"
              >
                {sla.stage === "resolved"
                  ? "SLA Concluded"
                  : sla.isBreached
                    ? `SLA Breached (${Math.abs(sla.remainingHours)}h overdue)`
                    : `${sla.remainingHours}h remaining`}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Phase limit: {sla.slaLimitHours} hours • Deadline: {new Date(sla.deadlineIso).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>

        {/* Required Action Card */}
        <Card
          data-testid="required-action-card"
          className={requiredAction.isUrgent ? "border-amber-500/50 bg-amber-500/5" : ""}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Required Action</CardTitle>
            <AlertTriangle
              className={`h-4 w-4 ${requiredAction.isUrgent ? "text-amber-600" : "text-muted-foreground"}`}
            />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="font-semibold text-sm" data-testid="required-action-title">
              {requiredAction.title}
            </div>
            <p className="text-xs text-muted-foreground" data-testid="required-action-desc">
              {requiredAction.description}
            </p>
            <p className="text-xs text-muted-foreground pt-1" data-testid="required-action-deadline">
              Deadline: <span className="font-medium text-foreground">{new Date(requiredAction.deadlineIso).toLocaleString()}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Adjudication Lock Notification Banner */}
      {isEvidenceLocked ? (
        <div
          role="alert"
          data-testid="evidence-locked-banner"
          className="flex items-center justify-between rounded-lg border border-purple-500/40 bg-purple-500/10 p-4 text-purple-700 dark:text-purple-300"
        >
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">Evidence Submissions Permanently Locked</p>
              <p className="text-xs opacity-90">
                This dispute has entered adjudication or final settlement. No further evidence modifications or submissions are permitted.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="border-purple-500 text-purple-600 font-bold text-xs">
            LOCKED
          </Badge>
        </div>
      ) : activeRole === "arbitrator" && dispute.status === "open" ? (
        <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-3">
            <KeyRound className="h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">Arbitrator Controls: Initiate Adjudication</p>
              <p className="text-xs text-muted-foreground">
                Once initiated, evidence gathering is permanently locked for all parties.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleStartAdjudication}
            disabled={isAdjudicating}
            data-testid="start-adjudication-btn"
          >
            {isAdjudicating ? "Locking..." : "Start Adjudication"}
          </Button>
        </div>
      ) : null}

      {/* Evidence Submission Form (Only when not locked and authorized) */}
      {canSubmitEvidence && !isEvidenceLocked && (
        <Card data-testid="evidence-submission-card">
          <CardHeader>
            <CardTitle className="text-lg">Submit Dispute Evidence</CardTitle>
            <CardDescription>
              Submit structured text statements, verified documents, or on-chain cryptographic attestations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitEvidence} className="space-y-4" data-testid="evidence-form">
              {/* Evidence Type Selection Tabs */}
              <div className="flex gap-2 border-b pb-3">
                <Button
                  type="button"
                  variant={evidenceType === "text" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEvidenceType("text")}
                  data-testid="type-text-btn"
                  className="flex items-center gap-1.5 text-xs"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Text Statement</span>
                </Button>
                <Button
                  type="button"
                  variant={evidenceType === "upload" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEvidenceType("upload")}
                  data-testid="type-upload-btn"
                  className="flex items-center gap-1.5 text-xs"
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  <span>Document / Upload</span>
                </Button>
                <Button
                  type="button"
                  variant={evidenceType === "attestation" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEvidenceType("attestation")}
                  data-testid="type-attestation-btn"
                  className="flex items-center gap-1.5 text-xs"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Cryptographic Attestation</span>
                </Button>
              </div>

              {/* Title & Visibility */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="ev-title" className="text-xs">Evidence Title</Label>
                  <Input
                    id="ev-title"
                    placeholder="e.g. Bill of Lading, Damaged Cargo Report"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1"
                    data-testid="evidence-title-input"
                  />
                </div>
                <div>
                  <Label htmlFor="ev-visibility" className="text-xs">Visibility Level</Label>
                  <select
                    id="ev-visibility"
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as DisputeEvidenceVisibility)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    data-testid="evidence-visibility-select"
                  >
                    <option value="public">Public (Visible to All & Investors)</option>
                    <option value="confidential">Confidential (Dispute Parties & Arbitrator Only)</option>
                    {activeRole === "arbitrator" && (
                      <option value="adjudicator_only">Adjudicator Only (Arbitrator Private)</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Conditional Upload Details */}
              {evidenceType === "upload" && (
                <div className="grid gap-4 sm:grid-cols-2 rounded-lg border bg-muted/20 p-3">
                  <div>
                    <Label htmlFor="file-name" className="text-xs">File Attachment Name</Label>
                    <Input
                      id="file-name"
                      placeholder="e.g. proof_of_delivery.pdf"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      className="mt-1"
                      data-testid="file-name-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="file-hash" className="text-xs">SHA-256 File Hash</Label>
                    <Input
                      id="file-hash"
                      placeholder="0x..."
                      value={fileHash}
                      onChange={(e) => setFileHash(e.target.value)}
                      className="mt-1"
                      data-testid="file-hash-input"
                    />
                  </div>
                </div>
              )}

              {/* Conditional Attestation Details */}
              {evidenceType === "attestation" && (
                <div className="grid gap-4 sm:grid-cols-2 rounded-lg border bg-muted/20 p-3">
                  <div>
                    <Label htmlFor="signer-address" className="text-xs">Oracle / Notary Address</Label>
                    <Input
                      id="signer-address"
                      placeholder="G..."
                      value={signerAddress}
                      onChange={(e) => setSignerAddress(e.target.value)}
                      className="mt-1"
                      data-testid="signer-address-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="signature-hash" className="text-xs">Cryptographic Signature</Label>
                    <Input
                      id="signature-hash"
                      placeholder="0x..."
                      value={signatureHash}
                      onChange={(e) => setSignatureHash(e.target.value)}
                      className="mt-1"
                      data-testid="signature-hash-input"
                    />
                  </div>
                </div>
              )}

              {/* Content Description */}
              <div>
                <Label htmlFor="ev-content" className="text-xs">Statement & Evidence Context</Label>
                <Textarea
                  id="ev-content"
                  placeholder="Detail the facts, references, and explanation supporting this evidence item..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="mt-1 min-h-[90px]"
                  data-testid="evidence-content-textarea"
                />
              </div>

              {formError && (
                <p className="text-xs text-destructive font-medium" data-testid="evidence-form-error">
                  {formError}
                </p>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto"
                data-testid="submit-evidence-btn"
              >
                {isSubmitting ? "Recording Evidence..." : "Submit Immutable Evidence"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Chronological Timeline & Evidence Feed */}
      <Card data-testid="timeline-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Immutable Evidence Timeline</CardTitle>
              <CardDescription>
                Chronological record of verified evidence and arbitration events
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              {timeline.length} Events Visible
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No authorized timeline events visible for role: {activeRole}.
            </p>
          ) : (
            <div className="relative border-l border-border pl-6 space-y-6">
              {timeline.map((event) => {
                const associatedEvidence = event.evidenceId
                  ? evidence.find((e) => e.id === event.evidenceId)
                  : undefined;

                return (
                  <div key={event.id} className="relative space-y-2" data-testid={`timeline-event-${event.id}`}>
                    {/* Timeline Node Bullet */}
                    <div className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-background border-2 border-primary">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    </div>

                    {/* Event Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{event.title}</span>
                        <Badge variant="secondary" className="text-xs uppercase">
                          {event.actorRole}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            event.visibility === "confidential"
                              ? "border-amber-500 text-amber-600"
                              : event.visibility === "adjudicator_only"
                                ? "border-purple-500 text-purple-600"
                                : ""
                          }`}
                        >
                          {event.visibility}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground">{event.description}</p>

                    {/* Associated Evidence Details */}
                    {associatedEvidence && (
                      <div
                        className="rounded-lg border bg-muted/20 p-3 text-xs space-y-2"
                        data-testid={`evidence-item-${associatedEvidence.id}`}
                      >
                        <div className="flex items-center justify-between font-medium">
                          <span className="flex items-center gap-1.5 text-foreground font-semibold">
                            {associatedEvidence.evidenceType === "upload" && <UploadCloud className="h-3.5 w-3.5" />}
                            {associatedEvidence.evidenceType === "attestation" && <KeyRound className="h-3.5 w-3.5" />}
                            {associatedEvidence.evidenceType === "text" && <FileText className="h-3.5 w-3.5" />}
                            {associatedEvidence.title}
                          </span>
                          <span className="text-muted-foreground text-[10px]">
                            ID: {associatedEvidence.id}
                          </span>
                        </div>
                        <p className="text-muted-foreground">{associatedEvidence.content}</p>

                        {/* File Attachment preview */}
                        {associatedEvidence.fileMetadata && (
                          <div className="flex items-center gap-2 rounded border bg-background p-2 text-xs">
                            <FileCheck2 className="h-4 w-4 text-emerald-600" />
                            <div>
                              <p className="font-medium">{associatedEvidence.fileMetadata.fileName}</p>
                              <p className="text-[10px] text-muted-foreground">
                                Hash: {associatedEvidence.fileMetadata.fileHash} • Size:{" "}
                                {(associatedEvidence.fileMetadata.fileSize / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Attestation details preview */}
                        {associatedEvidence.attestationMetadata && (
                          <div className="flex items-center gap-2 rounded border bg-background p-2 text-xs">
                            <ShieldCheck className="h-4 w-4 text-purple-600" />
                            <div>
                              <p className="font-medium">
                                Signer: {associatedEvidence.attestationMetadata.signerAddress}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                Sig: {associatedEvidence.attestationMetadata.signatureHash}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
