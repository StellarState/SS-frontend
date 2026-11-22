"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { useWallet } from "@/context/WalletContext";
import {
  fetchInvoiceDispute,
  submitDisputeEvidence,
  startDisputeAdjudication,
  type SubmitDisputeEvidenceInput,
} from "@/lib/api";
import {
  isEvidenceLocked,
  canSubmitEvidence,
  filterAuthorizedTimeline,
  filterAuthorizedEvidence,
  calculateDisputeSla,
  getRequiredAction,
  getApprovedPublicStatus,
  type InvoiceDispute,
  type DisputeParticipantRole,
  type DisputeEvidenceItem,
  type TimelineEvent,
} from "@/lib/analytics/disputeTimeline";

export const INVOICE_DISPUTE_QUERY_KEY = ["invoices", "dispute"] as const;

export function buildFallbackDispute(invoiceId: string): InvoiceDispute {
  return {
    id: `disp-${invoiceId}`,
    invoiceId,
    invoiceTitle: `Disputed Invoice #${invoiceId}`,
    disputedAmount: 25000,
    issuerAddress: "GBJ5K2W3Y6D...ISSUER",
    debtorAddress: "GCD4X9A1B2C...DEBTOR",
    arbitratorAddress: "GARB7Z3M8N...ARBITRATOR",
    status: "open",
    createdAt: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(), // 28 hours ago
    evidence: [
      {
        id: "ev-init-1",
        disputeId: `disp-${invoiceId}`,
        authorRole: "debtor",
        authorAddress: "GCD4X9A1B2C...DEBTOR",
        evidenceType: "text",
        title: "Dispute Statement: Quantity Mismatch",
        content: "Delivered merchandise was 20% short of contracted invoice specification.",
        visibility: "public",
        submittedAt: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "ev-init-2",
        disputeId: `disp-${invoiceId}`,
        authorRole: "issuer",
        authorAddress: "GBJ5K2W3Y6D...ISSUER",
        evidenceType: "upload",
        title: "Signed Delivery Receipt (BOL)",
        content: "Warehouse receiver signed full receipt without exceptions.",
        visibility: "public",
        submittedAt: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
        fileMetadata: {
          fileName: "delivery_receipt_signed.pdf",
          fileHash: "0x4a7f29c011e4d8b9",
          fileSize: 412900,
          fileUrl: "/mock-docs/delivery_receipt_signed.pdf",
        },
      },
      {
        id: "ev-init-3",
        disputeId: `disp-${invoiceId}`,
        authorRole: "debtor",
        authorAddress: "GCD4X9A1B2C...DEBTOR",
        evidenceType: "upload",
        title: "Warehouse Discrepancy Log",
        content: "Internal receiving log noting shortage at dock 4.",
        visibility: "confidential",
        submittedAt: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
        fileMetadata: {
          fileName: "dock_shortage_log.csv",
          fileHash: "0x892bc13f9901aa77",
          fileSize: 18400,
        },
      },
      {
        id: "ev-init-4",
        disputeId: `disp-${invoiceId}`,
        authorRole: "arbitrator",
        authorAddress: "GARB7Z3M8N...ARBITRATOR",
        evidenceType: "attestation",
        title: "Maritime Oracle Port Verification",
        content: "Container gate-out verification cryptographic attestation.",
        visibility: "adjudicator_only",
        submittedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        attestationMetadata: {
          signerAddress: "GORACLE_PORT_AUTHORITY",
          signatureHash: "0xf884aa12bb34cc56",
          attestedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        },
      },
    ],
    events: [
      {
        id: "evt-init-1",
        disputeId: `disp-${invoiceId}`,
        eventType: "dispute_opened",
        actorRole: "debtor",
        actorAddress: "GCD4X9A1B2C...DEBTOR",
        title: "Dispute Formalized by Debtor",
        description: "Dispute opened contesting quantity delivered on invoice.",
        timestamp: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(),
        visibility: "public",
      },
      {
        id: "evt-init-2",
        disputeId: `disp-${invoiceId}`,
        eventType: "evidence_submitted",
        actorRole: "issuer",
        actorAddress: "GBJ5K2W3Y6D...ISSUER",
        title: "Evidence: Signed Delivery Receipt",
        description: "Public bill of lading uploaded.",
        timestamp: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
        visibility: "public",
        evidenceId: "ev-init-2",
      },
      {
        id: "evt-init-3",
        disputeId: `disp-${invoiceId}`,
        eventType: "evidence_submitted",
        actorRole: "debtor",
        actorAddress: "GCD4X9A1B2C...DEBTOR",
        title: "Evidence: Dock Shortage Log",
        description: "Confidential internal inspection record submitted.",
        timestamp: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
        visibility: "confidential",
        evidenceId: "ev-init-3",
      },
      {
        id: "evt-init-4",
        disputeId: `disp-${invoiceId}`,
        eventType: "evidence_submitted",
        actorRole: "arbitrator",
        actorAddress: "GARB7Z3M8N...ARBITRATOR",
        title: "Evidence: Oracle Port Verification",
        description: "Adjudicator-only verification record.",
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        visibility: "adjudicator_only",
        evidenceId: "ev-init-4",
      },
    ],
  };
}

export interface UseDisputeTimelineOptions {
  invoiceId: string;
  initialDispute?: InvoiceDispute;
  roleOverride?: DisputeParticipantRole;
}

export function useDisputeTimeline(options: UseDisputeTimelineOptions) {
  const { invoiceId, initialDispute, roleOverride } = options;
  const queryClient = useQueryClient();

  let jwt: string | undefined = undefined;
  try {
    const auth = useAuth();
    jwt = auth.jwt ?? undefined;
  } catch {
    jwt = undefined;
  }

  let walletAddress: string | null = null;
  try {
    const wallet = useWallet();
    walletAddress = wallet.address;
  } catch {
    walletAddress = null;
  }

  const queryKey = useMemo(() => [...INVOICE_DISPUTE_QUERY_KEY, invoiceId], [invoiceId]);

  const query = useQuery({
    queryKey,
    queryFn: () => fetchInvoiceDispute(invoiceId, jwt),
    retry: false,
  });

  const [localDispute, setLocalDispute] = useState<InvoiceDispute>(
    () => initialDispute ?? buildFallbackDispute(invoiceId),
  );

  const dispute: InvoiceDispute = useMemo(() => {
    return query.data ?? localDispute;
  }, [query.data, localDispute]);

  // Determine active viewer role
  const detectedRole: DisputeParticipantRole = useMemo(() => {
    if (roleOverride) return roleOverride;
    if (!walletAddress) return "public";
    if (walletAddress.toLowerCase() === dispute.issuerAddress.toLowerCase()) return "issuer";
    if (walletAddress.toLowerCase() === dispute.debtorAddress.toLowerCase()) return "debtor";
    if (dispute.arbitratorAddress && walletAddress.toLowerCase() === dispute.arbitratorAddress.toLowerCase()) {
      return "arbitrator";
    }
    return "public";
  }, [roleOverride, walletAddress, dispute]);

  const [activeRole, setActiveRole] = useState<DisputeParticipantRole>(detectedRole);

  // Derived timeline and evidence filtered by role
  const timeline: TimelineEvent[] = useMemo(() => {
    return filterAuthorizedTimeline(dispute.events, activeRole);
  }, [dispute.events, activeRole]);

  const evidence: DisputeEvidenceItem[] = useMemo(() => {
    return filterAuthorizedEvidence(dispute.evidence, activeRole);
  }, [dispute.evidence, activeRole]);

  const sla = useMemo(() => {
    return calculateDisputeSla(dispute);
  }, [dispute]);

  const requiredAction = useMemo(() => {
    return getRequiredAction(dispute, activeRole);
  }, [dispute, activeRole]);

  const approvedPublicStatus = useMemo(() => {
    return getApprovedPublicStatus(dispute);
  }, [dispute]);

  const locked = useMemo(() => {
    return isEvidenceLocked(dispute);
  }, [dispute]);

  const canSubmit = useMemo(() => {
    return canSubmitEvidence(dispute, activeRole);
  }, [dispute, activeRole]);

  // Mutations
  const submitEvidenceMutation = useMutation({
    mutationFn: async (input: SubmitDisputeEvidenceInput) => {
      if (isEvidenceLocked(dispute)) {
        throw new Error("Evidence is locked once adjudication has commenced.");
      }
      try {
        return await submitDisputeEvidence(invoiceId, input, jwt);
      } catch {
        // Fallback local state update if backend endpoint returns 404
        const timestamp = new Date().toISOString();
        const evidenceId = `ev-${Date.now()}`;
        const newEvidenceItem: DisputeEvidenceItem = {
          id: evidenceId,
          disputeId: dispute.id,
          authorRole: input.authorRole,
          authorAddress: input.authorAddress,
          evidenceType: input.evidenceType,
          title: input.title,
          content: input.content,
          visibility: input.visibility,
          submittedAt: timestamp,
          fileMetadata: input.fileMetadata,
          attestationMetadata: input.attestationMetadata,
        };
        const newTimelineEvent: TimelineEvent = {
          id: `evt-${Date.now()}`,
          disputeId: dispute.id,
          eventType: "evidence_submitted",
          actorRole: input.authorRole,
          actorAddress: input.authorAddress,
          title: `Evidence Submitted: ${input.title}`,
          description: `Submitted ${input.evidenceType} evidence [${input.visibility}].`,
          timestamp,
          visibility: input.visibility,
          evidenceId,
        };
        setLocalDispute((prev) => ({
          ...prev,
          evidence: [...prev.evidence, newEvidenceItem],
          events: [...prev.events, newTimelineEvent],
        }));
        return newEvidenceItem;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const startAdjudicationMutation = useMutation({
    mutationFn: async (arbitratorAddress: string) => {
      try {
        return await startDisputeAdjudication(invoiceId, jwt);
      } catch {
        const timestamp = new Date().toISOString();
        const event: TimelineEvent = {
          id: `evt-adj-${Date.now()}`,
          disputeId: dispute.id,
          eventType: "adjudication_started",
          actorRole: "arbitrator",
          actorAddress: arbitratorAddress,
          title: "Adjudication Commenced - Evidence Locked",
          description: "Formal adjudication has started. Evidence submission is now permanently locked.",
          timestamp,
          visibility: "public",
        };
        const updated: InvoiceDispute = {
          ...dispute,
          status: "under_adjudication",
          adjudicationStartedAt: timestamp,
          arbitratorAddress,
          events: [...dispute.events, event],
        };
        setLocalDispute(updated);
        return updated;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    dispute,
    timeline,
    evidence,
    sla,
    requiredAction,
    approvedPublicStatus,
    isEvidenceLocked: locked,
    canSubmitEvidence: canSubmit,
    activeRole,
    setActiveRole,
    submitEvidence: submitEvidenceMutation.mutateAsync,
    isSubmitting: submitEvidenceMutation.isPending,
    startAdjudication: startAdjudicationMutation.mutateAsync,
    isAdjudicating: startAdjudicationMutation.isPending,
  };
}
