/** Auditor attestations for an invoice (#605). */

import {
  SOMA_API_BASE,
  readSomaJson,
  somaNumber,
  somaRecord,
  somaString,
} from "./somaShared";

export type AttestationVerdict = "verified" | "rejected" | "inconclusive";

export interface Attestation {
  id: string;
  auditor: string;
  verdict: AttestationVerdict;
  datedAt: string;
  auditorActive: boolean;
  auditorRevoked: boolean;
  documentChanged: boolean;
}

function normalizeVerdict(value: unknown): AttestationVerdict {
  const verdict = somaString(value).toLowerCase();
  if (verdict === "verified" || verdict === "approved") return "verified";
  if (verdict === "rejected" || verdict === "failed") return "rejected";
  return "inconclusive";
}

function normalize(payload: unknown): Attestation | null {
  const record = somaRecord(payload);
  const id = somaString(record.id ?? record.attestation_id);
  if (!id) return null;
  return {
    id,
    auditor: somaString(record.auditor ?? record.auditor_name, "Unknown auditor"),
    verdict: normalizeVerdict(record.verdict),
    datedAt: somaString(record.dated_at ?? record.date ?? record.created_at),
    auditorActive:
      record.auditor_active === undefined ? true : Boolean(record.auditor_active),
    auditorRevoked: Boolean(record.auditor_revoked ?? record.revoked),
    documentChanged: Boolean(record.document_changed ?? record.invalidated),
  };
}

/** Never invents attestations when the service is unavailable. */
export async function fetchAttestations(invoiceId: string): Promise<Attestation[]> {
  try {
    const res = await fetch(
      `${SOMA_API_BASE}/invoices/${encodeURIComponent(invoiceId)}/attestations`
    );
    if (!res.ok) return [];
    const payload = await readSomaJson(res);
    const root = somaRecord(payload);
    const rows = Array.isArray(root.attestations)
      ? root.attestations
      : Array.isArray(payload)
        ? payload
        : [];
    return rows
      .map(normalize)
      .filter((entry): entry is Attestation => entry !== null);
  } catch {
    return [];
  }
}

/** Attestation summaries may be embedded in invoice list payloads. */
export function embeddedAttestationSummary(invoice: {
  attestation_summary?: {
    verified?: number;
    total?: number;
    invalidated?: number;
  } | null;
}): { verified: number; total: number; invalidated: number } | null {
  const summary = invoice.attestation_summary;
  if (!summary) return null;
  return {
    verified: somaNumber(summary.verified),
    total: somaNumber(summary.total),
    invalidated: somaNumber(summary.invalidated),
  };
}
