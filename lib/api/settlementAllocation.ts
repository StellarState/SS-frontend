/** Settlement payout waterfall data (#603). */

import { API_BASE, asRecord, numberFrom, readJson, stringFrom } from "./shared";

export interface PayoutClass {
  id: string;
  label: string;
  priority: number;
  owed: number;
  paid: number;
  shortfall: number;
  isUserClass: boolean;
  userPayout: number;
}

export interface SettlementAllocation {
  status: "pending" | "settled";
  amountReceived: number;
  classes: PayoutClass[];
}

function normalizeClass(payload: unknown, userClassId: string | null): PayoutClass | null {
  const record = asRecord(payload);
  const id = stringFrom(record.id ?? record.class_id);
  if (!id) return null;
  const owed = numberFrom(record.owed ?? record.amount_owed);
  const paid = numberFrom(record.paid ?? record.amount_paid);
  return {
    id,
    label: stringFrom(record.label ?? record.name, "Payee class"),
    priority: numberFrom(record.priority, 0),
    owed,
    paid,
    shortfall: numberFrom(record.shortfall, Math.max(0, owed - paid)),
    isUserClass: id === userClassId,
    userPayout: numberFrom(record.user_payout ?? record.userPayout),
  };
}

/** Returns null when the backend has no allocation yet or is unavailable. */
export async function fetchSettlementAllocation(
  invoiceId: string
): Promise<SettlementAllocation | null> {
  try {
    const res = await fetch(`${API_BASE}/invoices/${encodeURIComponent(invoiceId)}/allocation`);
    if (!res.ok) return null;
    const root = asRecord(await readJson(res));
    const rows = Array.isArray(root.classes) ? root.classes : [];
    const classes = rows
      .map((row) => normalizeClass(row, stringFrom(root.user_class_id) || null))
      .filter((entry): entry is PayoutClass => entry !== null)
      .sort((a, b) => a.priority - b.priority);
    const status = stringFrom(root.status, "pending") === "settled" ? "settled" : "pending";
    return {
      status,
      amountReceived: numberFrom(root.amount_received ?? root.amountReceived),
      classes,
    };
  } catch {
    return null;
  }
}
