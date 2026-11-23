"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileCheck2,
  FileText,
  Gavel,
  KeyRound,
  Lock,
  Plus,
  Shield,
  ShieldAlert,
  Upload,
  UserCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  addEvidenceEvent,
  canSubmitEvidence,
  createMockDispute,
  filterAuthorizedEvents,
  resolveDispute,
  transitionToAdjudication,
  type DisputeStage,
  type EvidenceType,
  type InvoiceDisputeRecord,
  type ParticipantRole,
} from "@/lib/disputeEvidence";

interface DisputeEvidenceTimelineProps {
  invoiceId: string;
  invoiceTitle?: string;
  initialDispute?: InvoiceDisputeRecord;
  currentUserRole?: ParticipantRole;
  currentUserAddress?: string;
}

const DEFAULT_ISSUER = "GBZXN7PIRZGNMHGA72ODXR6DTZS657SDNVWYTG52M7NA65I4Q2IT5678";
const DEFAULT_DEBTOR = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7";
const DEFAULT_ARBITRATOR = "GCKFBDVOVXZ6TKOG4DT4H7F7DF7SZXF7Y4DXV23E4LNV3KGBEGY4O2WN";

export function DisputeEvidenceTimeline({
  invoiceId,
  invoiceTitle = "Industrial Machinery Invoice #8012",
  initialDispute,
  currentUserRole = "issuer",
  currentUserAddress = DEFAULT_ISSUER,
}: DisputeEvidenceTimelineProps) {
  const [dispute, setDispute] = useState<InvoiceDisputeRecord>(
    () =>
      initialDispute ||
      createMockDispute(invoiceId, invoiceTitle, DEFAULT_ISSUER, DEFAULT_DEBTOR)
  );

  const [activeRole, setActiveRole] = useState<ParticipantRole>(currentUserRole);
  const [evidenceTab, setEvidenceTab] = useState<EvidenceType>("text");
  const [title, setTitle] = useState("");
  const [textStatement, setTextStatement] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileCid, setFileCid] = useState("");
  const [attestationClaim, setAttestationClaim] = useState("");
  const [attestationSignature, setAttestationSignature] = useState("");
  const [isConfidential, setIsConfidential] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const isLocked = !canSubmitEvidence(dispute.stage);

  // Filter events based on active role
  const visibleEvents = useMemo(() => {
    const filtered = filterAuthorizedEvents(
      dispute.events,
      activeRole,
      currentUserAddress,
      [dispute.claimantAddress, dispute.respondentAddress]
    );

    return [...filtered].sort((a, b) => {
      const diff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      return sortOrder === "asc" ? diff : -diff;
    });
  }, [dispute.events, activeRole, currentUserAddress, dispute.claimantAddress, dispute.respondentAddress, sortOrder]);

  const handleSubmitEvidence = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionError(null);

    if (isLocked) {
      setSubmissionError(
        `Submission locked: Dispute is in '${dispute.stage}' stage.`
      );
      return;
    }

    if (!title.trim()) {
      setSubmissionError("Evidence title is required");
      return;
    }

    try {
      let payload = {};
      if (evidenceTab === "text") {
        if (!textStatement.trim()) {
          setSubmissionError("Text statement is required");
          return;
        }
        payload = { textStatement: textStatement.trim() };
      } else if (evidenceTab === "upload") {
        if (!fileName.trim()) {
          setSubmissionError("File name is required");
          return;
        }
        payload = {
          fileName: fileName.trim(),
          fileCid: fileCid.trim() || `Qm${Math.random().toString(36).slice(2, 12)}`,
          fileMimeType: "application/pdf",
          fileSizeBytes: 102400,
        };
      } else if (evidenceTab === "attestation") {
        if (!attestationClaim.trim()) {
          setSubmissionError("Attestation claim description is required");
          return;
        }
        payload = {
          attestationSigner: currentUserAddress,
          attestationClaim: attestationClaim.trim(),
          attestationSignature:
            attestationSignature.trim() || `SIG_ED25519_${Math.random().toString(36).slice(2, 10)}`,
        };
      }

      const updated = addEvidenceEvent(
        dispute,
        activeRole,
        currentUserAddress,
        evidenceTab,
        title.trim(),
        payload,
        isConfidential
      );

      setDispute(updated);
      setTitle("");
      setTextStatement("");
      setFileName("");
      setFileCid("");
      setAttestationClaim("");
      setAttestationSignature("");
    } catch (err: unknown) {
      setSubmissionError(
        err instanceof Error ? err.message : "Evidence submission failed"
      );
    }
  };

  const handleStartAdjudication = () => {
    setDispute((prev) => transitionToAdjudication(prev, DEFAULT_ARBITRATOR));
  };

  const handleResolveDispute = (
    outcome: "resolved_in_favor_of_issuer" | "resolved_in_favor_of_debtor" | "dismissed"
  ) => {
    setDispute((prev) =>
      resolveDispute(
        prev,
        outcome,
        "Arbitrator completed full evidentiary review and rendered final binding decision."
      )
    );
  };

  const formatStatusLabel = (status: string) => {
    switch (status) {
      case "under_review":
        return "Under Review";
      case "in_adjudication":
        return "In Adjudication";
      case "resolved_in_favor_of_issuer":
        return "Resolved (Issuer Favored)";
      case "resolved_in_favor_of_debtor":
        return "Resolved (Debtor Favored)";
      case "dismissed":
        return "Dismissed";
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6" data-testid="dispute-evidence-timeline">
      {/* Dispute Header & Public Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  {dispute.disputeId}
                </Badge>
                <Badge
                  variant={
                    dispute.stage === "resolved"
                      ? "default"
                      : dispute.stage === "adjudication"
                      ? "destructive"
                      : "secondary"
                  }
                  className="capitalize text-xs font-semibold"
                  data-testid="public-status-badge"
                >
                  {formatStatusLabel(dispute.publicStatus)}
                </Badge>
              </div>
              <h2 className="text-xl font-bold">{dispute.invoiceTitle}</h2>
              <p className="text-xs text-muted-foreground">
                Invoice Reference: {dispute.invoiceId} | Created:{" "}
                {new Date(dispute.createdAt).toLocaleDateString()}
              </p>
            </div>

            {/* Viewer Role Switcher for Testing/Role-specific view */}
            <div className="flex items-center gap-2">
              <Label htmlFor="active-role-select" className="text-xs text-muted-foreground whitespace-nowrap">
                Viewing As:
              </Label>
              <Select
                value={activeRole}
                onValueChange={(val) => setActiveRole(val as ParticipantRole)}
              >
                <SelectTrigger id="active-role-select" className="h-8 w-36 text-xs" data-testid="select-viewer-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="issuer">Issuer</SelectItem>
                  <SelectItem value="debtor">Debtor</SelectItem>
                  <SelectItem value="arbitrator">Arbitrator</SelectItem>
                  <SelectItem value="investor">Investor</SelectItem>
                  <SelectItem value="public">Public Observer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SLA Age & Required Action Banner */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card data-testid="sla-age-card">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">SLA Timeline & Age</p>
              <p className="text-lg font-bold" data-testid="sla-age-text">
                {dispute.sla.slaAgeDays} Days Elapsed / {dispute.sla.slaDaysTotal} Days SLA Target
              </p>
              <p className="text-xs text-muted-foreground">
                Target Resolution: {new Date(dispute.sla.slaDeadline).toLocaleDateString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="required-action-card">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-full bg-amber-500/10 p-3 text-amber-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Required Action & Deadline</p>
                <Badge variant="outline" className="text-[10px] uppercase font-mono">
                  {dispute.sla.requiredAction.targetRole}
                </Badge>
              </div>
              <p className="text-sm font-semibold" data-testid="action-description">
                {dispute.sla.requiredAction.actionDescription}
              </p>
              <p className="text-xs text-amber-600 font-medium" data-testid="action-deadline">
                Deadline: {new Date(dispute.sla.requiredAction.actionDeadline).toLocaleDateString()} (
                {dispute.sla.requiredAction.hoursRemaining}h remaining)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Adjudication Lock Warning Notice */}
      {isLocked && (
        <div
          className="flex items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
          data-testid="adjudication-locked-notice"
        >
          <Lock className="h-5 w-5 shrink-0" />
          <div>
            <span className="font-semibold">Evidence Submission Locked ({dispute.stage})</span>
            <p className="text-xs opacity-90">
              Adjudication has commenced. In accordance with dispute resolution rules, evidence is immutable and no further submissions or modifications are permitted.
            </p>
          </div>
        </div>
      )}

      {/* Adjudication Controls for Authorized Arbitrator */}
      {activeRole === "arbitrator" && (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Gavel className="h-4 w-4 text-primary" />
              Arbitrator Adjudication Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 pt-1">
            {dispute.stage === "evidence_submission" && (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={handleStartAdjudication}
                data-testid="start-adjudication-btn"
              >
                <Lock className="mr-1.5 h-3.5 w-3.5" />
                Commence Adjudication (Lock Evidence)
              </Button>
            )}
            {dispute.stage === "adjudication" && (
              <>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleResolveDispute("resolved_in_favor_of_issuer")}
                  data-testid="resolve-favor-issuer-btn"
                >
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  Rule for Issuer
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleResolveDispute("resolved_in_favor_of_debtor")}
                  data-testid="resolve-favor-debtor-btn"
                >
                  Rule for Debtor
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => handleResolveDispute("dismissed")}
                  data-testid="resolve-dismiss-btn"
                >
                  Dismiss Dispute
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Evidence Timeline */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Immutable Evidence Timeline ({visibleEvents.length})</h3>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Order:</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setSortOrder((o) => (o === "asc" ? "desc" : "asc"))}
            >
              {sortOrder === "asc" ? "Chronological (Oldest First)" : "Newest First"}
            </Button>
          </div>
        </div>

        {visibleEvents.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No evidence visible for your current authorization role.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3" data-testid="timeline-events-list">
            {visibleEvents.map((evt) => (
              <Card key={evt.eventId} data-testid={`timeline-event-${evt.eventId}`}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize text-xs font-semibold">
                        Role: {evt.actorRole}
                      </Badge>
                      <Badge variant="secondary" className="capitalize text-xs">
                        {evt.evidenceType}
                      </Badge>
                      {evt.isConfidential && (
                        <Badge variant="destructive" className="text-[10px]">
                          Confidential
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(evt.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <h4 className="font-semibold text-sm">{evt.title}</h4>

                  {/* Evidence Payload Rendering */}
                  {evt.evidenceType === "text" && (
                    <p className="text-sm text-muted-foreground bg-muted/40 p-3 rounded-md">
                      {evt.payload.textStatement}
                    </p>
                  )}

                  {evt.evidenceType === "upload" && (
                    <div className="flex items-center gap-3 rounded-md border bg-muted/20 p-2.5 text-xs">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-medium">{evt.payload.fileName}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">
                          IPFS CID: {evt.payload.fileCid}
                        </div>
                      </div>
                    </div>
                  )}

                  {evt.evidenceType === "attestation" && (
                    <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-primary">
                        <KeyRound className="h-4 w-4" />
                        Cryptographic Attestation
                      </div>
                      <p className="text-muted-foreground">{evt.payload.attestationClaim}</p>
                      <div className="font-mono text-[10px] text-muted-foreground truncate">
                        Signature: {evt.payload.attestationSignature}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t text-[11px] text-muted-foreground">
                    <span className="font-mono truncate max-w-xs">
                      Signer: {evt.actorAddress}
                    </span>
                    <span className="font-mono">Hash: {evt.immutableHash}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Structured Evidence Submission Form */}
      {!isLocked && (
        <Card data-testid="evidence-submission-form-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              Submit Evidence ({activeRole})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitEvidence} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="evidence-title">Evidence Title</Label>
                <Input
                  id="evidence-title"
                  placeholder="e.g. Proof of Partial Settlement Transfer"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  data-testid="input-evidence-title"
                />
              </div>

              <Tabs
                value={evidenceTab}
                onValueChange={(val) => setEvidenceTab(val as EvidenceType)}
              >
                <TabsList className="grid grid-cols-3">
                  <TabsTrigger value="text" data-testid="tab-text-evidence">
                    <FileText className="mr-1.5 h-3.5 w-3.5" />
                    Text Testimony
                  </TabsTrigger>
                  <TabsTrigger value="upload" data-testid="tab-upload-evidence">
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    Document Upload
                  </TabsTrigger>
                  <TabsTrigger value="attestation" data-testid="tab-attestation-evidence">
                    <KeyRound className="mr-1.5 h-3.5 w-3.5" />
                    Attestation
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="space-y-2 pt-2">
                  <Label htmlFor="statement-text">Testimony Statement</Label>
                  <Textarea
                    id="statement-text"
                    rows={4}
                    placeholder="Enter detailed facts, dates, reference numbers, or commercial dispute testimony..."
                    value={textStatement}
                    onChange={(e) => setTextStatement(e.target.value)}
                    data-testid="textarea-statement-text"
                  />
                </TabsContent>

                <TabsContent value="upload" className="space-y-3 pt-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="file-name">Document Name</Label>
                    <Input
                      id="file-name"
                      placeholder="e.g. proof_of_delivery_bol.pdf"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      data-testid="input-file-name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="file-cid">IPFS Content Identifier (CID)</Label>
                    <Input
                      id="file-cid"
                      placeholder="e.g. QmZtmD2qt8fQgdfmkfd82ndsa8fd"
                      value={fileCid}
                      onChange={(e) => setFileCid(e.target.value)}
                      data-testid="input-file-cid"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="attestation" className="space-y-3 pt-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="attestation-claim">Verified Claim Description</Label>
                    <Input
                      id="attestation-claim"
                      placeholder="e.g. SWIFT Wire confirmation ref #TX9941 validated"
                      value={attestationClaim}
                      onChange={(e) => setAttestationClaim(e.target.value)}
                      data-testid="input-attestation-claim"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="attestation-signature">Cryptographic Signature</Label>
                    <Input
                      id="attestation-signature"
                      placeholder="SIG_ED25519_..."
                      value={attestationSignature}
                      onChange={(e) => setAttestationSignature(e.target.value)}
                      data-testid="input-attestation-signature"
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="confidential-toggle"
                  checked={isConfidential}
                  onChange={(e) => setIsConfidential(e.target.checked)}
                  className="h-4 w-4 rounded"
                  data-testid="checkbox-confidential"
                />
                <Label htmlFor="confidential-toggle" className="text-xs cursor-pointer">
                  Confidential: Restrict visibility to dispute participants and arbitrator only
                </Label>
              </div>

              {submissionError && (
                <p className="text-xs text-destructive" data-testid="evidence-submission-error">
                  {submissionError}
                </p>
              )}

              <div className="flex justify-end pt-2">
                <Button type="submit" size="sm" data-testid="submit-evidence-btn">
                  Submit Evidence
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
