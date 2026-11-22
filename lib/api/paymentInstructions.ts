/** Public payment instructions for a confirmation token (#608). */

import { SOMA_API_BASE, readSomaJson, somaNumber, somaRecord, somaString } from "./somaShared";
import { classifyTokenFailure, type TokenFailure } from "@/lib/paymentUri";

export type PaymentStage = "received" | "matched" | "settled";

export interface PaymentInstructions {
  amountDue: number;
  lateInterest: number;
  destination: string;
  memo: string;
  dueAt: string;
  stages: Record<PaymentStage, boolean>;
}

export type PaymentInstructionsResult =
  | { ok: true; instructions: PaymentInstructions }
  | { ok: false; failure: TokenFailure };

export async function fetchPaymentInstructions(
  token: string
): Promise<PaymentInstructionsResult> {
  if (!token) return { ok: false, failure: "invalid" };

  try {
    const res = await fetch(
      `${SOMA_API_BASE}/payment-instructions/${encodeURIComponent(token)}`
    );
    if (!res.ok) {
      return { ok: false, failure: classifyTokenFailure(res.status, await readSomaJson(res)) };
    }

    const root = somaRecord(await readSomaJson(res));
    const destination = somaString(root.destination ?? root.destination_account);
    const memo = somaString(root.memo ?? root.reference);
    if (!destination || !memo) return { ok: false, failure: "invalid" };

    const stages = somaRecord(root.stages ?? root.status);
    return {
      ok: true,
      instructions: {
        amountDue: somaNumber(root.amount_due ?? root.amountDue),
        lateInterest: somaNumber(root.late_interest ?? root.lateInterest),
        destination,
        memo,
        dueAt: somaString(root.due_at ?? root.dueAt),
        stages: {
          received: Boolean(stages.received ?? stages.payment_received),
          matched: Boolean(stages.matched ?? stages.payment_matched),
          settled: Boolean(stages.settled ?? stages.invoice_settled),
        },
      },
    };
  } catch {
    return { ok: false, failure: "unavailable" };
  }
}
