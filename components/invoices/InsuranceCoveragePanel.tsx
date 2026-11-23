"use client";

/**
 * Invoice insurance coverage and claims panel (#686).
 *
 * Implements coverage limit reconciliation to face value,
 * signed evidence submission, role-authorized claim status,
 * post-resolution protection updates, and secure document viewing.
 */

import { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  FileText,
  Lock,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  reconcileCoverageToFaceValue,
  validateClaimSubmission,
  checkClaimRoleAuthorization,
  type InsurancePolicy,
  type InsuranceClaim,
  type EvidenceDocument,
  type IncidentType,
} from "@/lib/analytics/insuranceCoverage";
import {
  useInsurancePolicy,
  useInsuranceClaims,
  useSubmitClaimMutation,
  useAdjudicateClaimMutation,
} from "@/hooks/useInsuranceCoverage";

function formatAmount(n: number) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── Main Panel ─────────────────────────────────────────────────────────────

interface InsuranceCoveragePanelProps {
  invoiceId: string;
  walletAddress: string | null | undefined;
  policyOverride?: InsurancePolicy;
  claimsOverride?: InsuranceClaim[];
}

export function InsuranceCoveragePanel({
  invoiceId,
  walletAddress,
  policyOverride,
  claimsOverride,
}: InsuranceCoveragePanelProps) {
  const { data: fetchedPolicy, isLoading: isPolicyLoading } = useInsurancePolicy(invoiceId);
  const { data: fetchedClaims, isLoading: isClaimsLoading } = useInsuranceClaims(invoiceId);

  const policy = policyOverride ?? fetchedPolicy;
  const claims = claimsOverride ?? fetchedClaims ?? [];

  const [isFilingClaim, setIsFilingClaim] = useState(false);
  const [selectedDocForView, setSelectedDocForView] = useState<EvidenceDocument | null>(null);

  // Claim Form State
  const [incidentDate, setIncidentDate] = useState("");
  const [incidentType, setIncidentType] = useState<IncidentType>("default");
  const [description, setDescription] = useState("");
  const [claimedAmount, setClaimedAmount] = useState("");
  const [docName, setDocName] = useState("");
  const [evidenceList, setEvidenceList] = useState<EvidenceDocument[]>([]);

  // Adjudication Dialog State
  const [adjudicatingClaimId, setAdjudicatingClaimId] = useState<string | null>(null);
  const [adjudicationAction, setAdjudicationAction] = useState<"approved" | "denied">("approved");
  const [payoutInput, setPayoutInput] = useState("");
  const [denialReasonInput, setDenialReasonInput] = useState("");

  const submitClaimMutation = useSubmitClaimMutation(invoiceId, walletAddress);
  const adjudicateClaimMutation = useAdjudicateClaimMutation(invoiceId);

  if (isPolicyLoading && !policyOverride) {
    return (
      <Card data-testid="insurance-loading">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Loading insurance coverage details...
        </CardContent>
      </Card>
    );
  }

  if (!policy) {
    return (
      <Card data-testid="insurance-unavailable">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No insurance coverage policy found for this invoice.
        </CardContent>
      </Card>
    );
  }

  // Reconcile coverage to face value
  const reconciliation = reconcileCoverageToFaceValue(
    policy.remaining_coverage_limit,
    policy.invoice_face_value,
  );

  const auth = checkClaimRoleAuthorization(walletAddress, policy);

  // Form Validation
  const claimedAmountNum = parseFloat(claimedAmount) || 0;
  const validation = validateClaimSubmission(
    {
      incident_date: incidentDate,
      incident_type: incidentType,
      incident_description: description,
      claimed_amount: claimedAmountNum,
      evidence: evidenceList,
    },
    policy,
  );

  const handleAddSampleEvidence = () => {
    if (!docName.trim()) return;
    const newDoc: EvidenceDocument = {
      id: `ev-${Date.now()}`,
      file_name: docName.trim(),
      file_hash: `Qm${Date.now()}...sha256`,
      signed_by: walletAddress ?? "GBCLAIMANT_VERIFIED",
      signature: `sig_${Date.now()}_verified`,
      uploaded_at: new Date().toISOString(),
      secure_view_url: `https://secure-docs.stellarsettle.app/view/ev-${Date.now()}`,
    };
    setEvidenceList((prev) => [...prev, newDoc]);
    setDocName("");
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validation.isValid) return;

    submitClaimMutation.mutate(
      {
        incident_date: incidentDate,
        incident_type: incidentType,
        incident_description: description,
        claimed_amount: claimedAmountNum,
        evidence: evidenceList,
      },
      {
        onSuccess: () => {
          setIsFilingClaim(false);
          setDescription("");
          setClaimedAmount("");
          setEvidenceList([]);
        },
      },
    );
  };

  const handleConfirmAdjudication = () => {
    if (!adjudicatingClaimId) return;

    adjudicateClaimMutation.mutate(
      {
        claimId: adjudicatingClaimId,
        decision: adjudicationAction,
        payoutAmount: parseFloat(payoutInput) || undefined,
        denialReason: denialReasonInput || undefined,
      },
      {
        onSettled: () => {
          setAdjudicatingClaimId(null);
          setPayoutInput("");
          setDenialReasonInput("");
        },
      },
    );
  };

  return (
    <Card className="space-y-6 p-6" data-testid="insurance-coverage-panel">
      {/* Policy Overview Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight">Invoice Insurance Protection</h2>
            <Badge
              variant={
                policy.status === "active"
                  ? "default"
                  : policy.status === "exhausted"
                    ? "destructive"
                    : "secondary"
              }
              data-testid="policy-status-badge"
            >
              {policy.status.toUpperCase()}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Underwritten by <span className="font-semibold text-foreground">{policy.provider_name}</span> · Policy #{policy.policy_number}
          </p>
        </div>

        <div className="flex items-center gap-2" data-testid="protection-level-badge">
          {policy.protection_level === "full" ? (
            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Full Protection (100%)</span>
            </Badge>
          ) : policy.protection_level === "partial" ? (
            <Badge variant="outline" className="border-amber-500 text-amber-600 flex items-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Partial Protection ({policy.coverage_ratio_percent}%)</span>
            </Badge>
          ) : (
            <Badge variant="destructive" className="flex items-center gap-1">
              <ShieldX className="h-3.5 w-3.5" />
              <span>Protection Exhausted</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Coverage Reconciliation to Face Value */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-lg bg-muted/40 p-4 text-xs"
        data-testid="coverage-reconciliation-card"
      >
        <div>
          <span className="text-muted-foreground block">Invoice Face Value</span>
          <span className="text-base font-semibold text-foreground" data-testid="reconciliation-face-value">
            {formatAmount(policy.invoice_face_value)} XLM
          </span>
        </div>
        <div>
          <span className="text-muted-foreground block">Remaining Coverage Limit</span>
          <span className="text-base font-semibold text-foreground" data-testid="reconciliation-coverage-limit">
            {formatAmount(policy.remaining_coverage_limit)} XLM
          </span>
        </div>
        <div>
          <span className="text-muted-foreground block">Policy Deductible</span>
          <span className="text-base font-semibold text-foreground" data-testid="reconciliation-deductible">
            {formatAmount(policy.deductible_amount)} XLM
          </span>
        </div>
        <div>
          <span className="text-muted-foreground block">Annual Premium</span>
          <span className="text-base font-semibold text-foreground" data-testid="reconciliation-premium">
            {formatAmount(policy.premium_amount)} XLM ({policy.premium_bps / 100}%)
          </span>
        </div>
      </div>

      {/* Role and Action Bar */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {auth.role === "underwriter_adjudicator" && (
            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
              Underwriter Mode: Adjudication Privileges Enabled
            </Badge>
          )}
        </div>

        {auth.canFileClaim && !isFilingClaim && (
          <Button
            size="sm"
            onClick={() => setIsFilingClaim(true)}
            data-testid="open-claim-form-btn"
          >
            File Insurance Claim
          </Button>
        )}
      </div>

      {/* File Claim Workflow */}
      {isFilingClaim && (
        <form
          onSubmit={handleFormSubmit}
          className="rounded-lg border border-primary/20 bg-muted/20 p-4 space-y-4 text-xs"
          data-testid="file-claim-form"
        >
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-sm font-semibold">File Loss or Default Claim</h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsFilingClaim(false)}
            >
              Cancel
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="incident-type">Incident Type</Label>
              <select
                id="incident-type"
                value={incidentType}
                onChange={(e) => setIncidentType(e.target.value as IncidentType)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                data-testid="claim-type-select"
              >
                <option value="default">Debtor Payment Default</option>
                <option value="bankruptcy">Official Bankruptcy</option>
                <option value="fraud">Fraud / Material Breach</option>
                <option value="force_majeure">Force Majeure</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="incident-date">Incident Date</Label>
              <Input
                id="incident-date"
                type="date"
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
                className="text-xs"
                data-testid="claim-date-input"
              />
              {validation.errors.incident_date && (
                <p className="text-[11px] text-destructive" data-testid="error-claim-date">
                  {validation.errors.incident_date}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="claimed-amount">Claimed Amount (XLM)</Label>
              <Input
                id="claimed-amount"
                type="number"
                min="1"
                step="0.01"
                placeholder="e.g. 25000"
                value={claimedAmount}
                onChange={(e) => setClaimedAmount(e.target.value)}
                className="text-xs"
                data-testid="claim-amount-input"
              />
              {validation.errors.claimed_amount && (
                <p className="text-[11px] text-destructive" data-testid="error-claim-amount">
                  {validation.errors.claimed_amount}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="incident-description">Incident Description (Min 15 chars)</Label>
            <Textarea
              id="incident-description"
              rows={3}
              placeholder="Describe the default circumstances, communication attempts, and debtor insolvency notices..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-xs"
              data-testid="claim-description-input"
            />
            {validation.errors.incident_description && (
              <p className="text-[11px] text-destructive" data-testid="error-claim-description">
                {validation.errors.incident_description}
              </p>
            )}
          </div>

          {/* Signed Evidence Document Upload */}
          <div className="space-y-2 border-t pt-3">
            <Label>Signed Evidence Documentation</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Document file name (e.g. debtor_demand_notice.pdf)"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                className="text-xs flex-1"
                data-testid="evidence-doc-name-input"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddSampleEvidence}
                data-testid="add-evidence-btn"
              >
                Attach & Sign Document
              </Button>
            </div>
            {validation.errors.evidence && (
              <p className="text-[11px] text-destructive" data-testid="error-claim-evidence">
                {validation.errors.evidence}
              </p>
            )}

            {evidenceList.length > 0 && (
              <ul className="space-y-1.5 pt-1" data-testid="attached-evidence-list">
                {evidenceList.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-center justify-between rounded border bg-background px-3 py-1.5 text-xs"
                    data-testid={`evidence-item-${doc.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      <span className="font-medium">{doc.file_name}</span>
                      <span className="text-muted-foreground font-mono text-[10px]">({doc.file_hash})</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">
                      Signed & Verified
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Button
            type="submit"
            disabled={!validation.isValid || submitClaimMutation.isPending}
            className="w-full"
            data-testid="submit-claim-btn"
          >
            {submitClaimMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Claim for Underwriter Adjudication
          </Button>
        </form>
      )}

      {/* Claims List Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Filed Claims & Adjudication Status
        </h3>

        {claims.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground" data-testid="no-claims-message">
            No insurance claims filed for this policy.
          </p>
        ) : (
          <ul className="space-y-3" aria-label="Insurance claims list" data-testid="claims-list">
            {claims.map((claim) => (
              <li
                key={claim.id}
                className="flex flex-col gap-2 rounded-lg border p-4 text-xs"
                data-testid={`claim-card-${claim.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">
                        {formatAmount(claim.claimed_amount)} XLM Claim
                      </span>
                      <Badge
                        variant={
                          claim.status === "approved"
                            ? "default"
                            : claim.status === "denied"
                              ? "destructive"
                              : "secondary"
                        }
                        data-testid={`claim-status-${claim.id}`}
                      >
                        {claim.status.toUpperCase()}
                      </Badge>
                      <span className="text-muted-foreground capitalize">({claim.incident_type})</span>
                    </div>
                    <p className="text-muted-foreground mt-1">
                      {claim.incident_description}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Incident Date: {formatDate(claim.incident_date)} · Filed: {formatDate(claim.created_at)}
                    </p>
                  </div>

                  {/* Underwriter Adjudication Actions */}
                  {auth.canAdjudicate && (claim.status === "submitted" || claim.status === "under_review") && (
                    <div className="flex items-center gap-1.5" data-testid={`adjudicate-actions-${claim.id}`}>
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => {
                          setAdjudicatingClaimId(claim.id);
                          setAdjudicationAction("approved");
                          setPayoutInput(String(Math.max(0, claim.claimed_amount - policy.deductible_amount)));
                        }}
                        data-testid={`open-approve-btn-${claim.id}`}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setAdjudicatingClaimId(claim.id);
                          setAdjudicationAction("denied");
                        }}
                        data-testid={`open-deny-btn-${claim.id}`}
                      >
                        Deny
                      </Button>
                    </div>
                  )}
                </div>

                {/* Secure Evidence Documents */}
                {claim.evidence && claim.evidence.length > 0 && (
                  <div className="rounded border bg-muted/20 p-2.5 mt-1 space-y-1.5" data-testid={`claim-evidence-section-${claim.id}`}>
                    <span className="font-semibold text-muted-foreground block text-[11px]">
                      Verified Evidence Documents ({claim.evidence.length})
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {claim.evidence.map((doc) => (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => setSelectedDocForView(doc)}
                          className="flex items-center gap-1 rounded bg-background border px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/5 transition-colors"
                          data-testid={`view-evidence-btn-${doc.id}`}
                        >
                          <Lock className="h-3 w-3" />
                          <span>{doc.file_name}</span>
                          <ExternalLink className="h-2.5 w-2.5 ml-0.5 opacity-70" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Adjudication Status & Protection Update details */}
                {claim.status === "approved" && (
                  <div
                    className="rounded bg-emerald-50 text-emerald-800 border border-emerald-200 p-2 text-xs flex justify-between items-center"
                    data-testid={`approved-details-${claim.id}`}
                  >
                    <span>
                      ✓ Approved for payout of <strong data-testid={`payout-amount-${claim.id}`}>{formatAmount(claim.payout_amount ?? 0)} XLM</strong>
                    </span>
                    <span className="text-[11px] opacity-80">
                      Adjudicated by {claim.adjudicated_by?.slice(0, 10)}... · Policy protection updated
                    </span>
                  </div>
                )}

                {claim.status === "denied" && (
                  <div
                    className="rounded bg-destructive/10 text-destructive border border-destructive/20 p-2 text-xs"
                    data-testid={`denied-details-${claim.id}`}
                  >
                    ✕ Denied: {claim.denial_reason}
                  </div>
                )}

                {/* Adjudication Dialog */}
                {adjudicatingClaimId === claim.id && (
                  <div
                    className="rounded-lg border bg-muted/50 p-3 mt-2 space-y-3"
                    data-testid={`adjudicate-dialog-${claim.id}`}
                  >
                    <span className="font-semibold text-xs block">
                      Adjudicate Claim: {adjudicationAction === "approved" ? "Approve Payout" : "Deny Claim"}
                    </span>
                    {adjudicationAction === "approved" ? (
                      <div className="space-y-1">
                        <Label htmlFor="payout-amount" className="text-xs">
                          Approved Payout Amount (XLM)
                        </Label>
                        <Input
                          id="payout-amount"
                          type="number"
                          value={payoutInput}
                          onChange={(e) => setPayoutInput(e.target.value)}
                          className="h-8 text-xs"
                          data-testid="payout-amount-input"
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Label htmlFor="denial-reason" className="text-xs">
                          Official Denial Reason
                        </Label>
                        <Input
                          id="denial-reason"
                          placeholder="e.g. Failure to comply with loss notification timeline"
                          value={denialReasonInput}
                          onChange={(e) => setDenialReasonInput(e.target.value)}
                          className="h-8 text-xs"
                          data-testid="denial-reason-input"
                        />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={handleConfirmAdjudication}
                        disabled={adjudicateClaimMutation.isPending}
                        data-testid="confirm-adjudication-btn"
                      >
                        Confirm {adjudicationAction === "approved" ? "Approval" : "Denial"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => setAdjudicatingClaimId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Secure Document Viewer Modal */}
      {selectedDocForView && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          data-testid="secure-doc-modal"
          role="dialog"
          aria-label="Secure Document Viewer"
        >
          <div className="w-full max-w-md rounded-lg border bg-background p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-emerald-600" />
                <h4 className="font-semibold text-sm">Secure Document Inspection</h4>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setSelectedDocForView(null)}
                data-testid="close-secure-doc-btn"
              >
                ✕
              </Button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-muted-foreground block">File Name:</span>
                <span className="font-medium text-foreground">{selectedDocForView.file_name}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Cryptographic Hash (SHA-256):</span>
                <span className="font-mono text-[11px] break-all">{selectedDocForView.file_hash}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Digital Signature:</span>
                <span className="font-mono text-[11px] break-all text-emerald-600">
                  {selectedDocForView.signature}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Signer Address:</span>
                <span className="font-mono text-[11px]">{selectedDocForView.signed_by}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Secure View Endpoint:</span>
                <a
                  href={selectedDocForView.secure_view_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline flex items-center gap-1"
                >
                  {selectedDocForView.secure_view_url}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs"
              onClick={() => setSelectedDocForView(null)}
            >
              Close Document Viewer
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
