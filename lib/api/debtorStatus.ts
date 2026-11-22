/** Debtor classifications and their change history (#606). */

import { SOMA_API_BASE, readSomaJson, somaRecord, somaString } from "./somaShared";

export type DebtorStatus = "Trusted" | "Neutral" | "Watch" | "Blocked";

export interface DebtorStatusChange {
  from: DebtorStatus;
  to: DebtorStatus;
  changedAt: string;
}

export interface DebtorStatusResult {
  status: DebtorStatus;
  history: DebtorStatusChange[];
}

function normalizeStatus(value: unknown): DebtorStatus {
  const status = somaString(value).toLowerCase();
  if (status === "trusted") return "Trusted";
  if (status === "watch") return "Watch";
  if (status === "blocked") return "Blocked";
  return "Neutral";
}

/** Unknown debtors are deliberately rendered as Neutral, never as blocked. */
export async function fetchDebtorStatus(debtorHash: string): Promise<DebtorStatusResult> {
  const neutral: DebtorStatusResult = { status: "Neutral", history: [] };
  if (!debtorHash) return neutral;

  try {
    const res = await fetch(
      `${SOMA_API_BASE}/debtors/${encodeURIComponent(debtorHash)}/status`
    );
    if (!res.ok) return neutral;
    const root = somaRecord(await readSomaJson(res));
    const rows = Array.isArray(root.history) ? root.history : [];
    return {
      status: normalizeStatus(root.status),
      history: rows.map((row) => {
        const change = somaRecord(row);
        return {
          from: normalizeStatus(change.from ?? change.previous_status),
          to: normalizeStatus(change.to ?? change.status),
          changedAt: somaString(change.changed_at ?? change.date),
        };
      }),
    };
  } catch {
    return neutral;
  }
}
