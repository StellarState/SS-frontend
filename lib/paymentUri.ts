/** Stellar payment URI helpers (#608). */

export const PAYMENT_DECIMALS = 7;

/** Display-only formatter; it intentionally includes thousands separators. */
export function formatPaymentAmount(value: number): string {
  if (!Number.isFinite(value)) return `0.${"0".repeat(PAYMENT_DECIMALS)}`;
  return value.toLocaleString("en-US", {
    minimumFractionDigits: PAYMENT_DECIMALS,
    maximumFractionDigits: PAYMENT_DECIMALS,
  });
}

/** URI formatter: no grouping separators, exactly seven decimals. */
function formatUriAmount(value: number): string {
  return (Number.isFinite(value) ? value : 0).toFixed(PAYMENT_DECIMALS);
}

/** Builds the URI encoded by the QR code. The memo is mandatory. */
export function buildPaymentUri(
  destination: string,
  amount: number,
  memo: string
): string {
  const params = new URLSearchParams();
  params.set("amount", formatUriAmount(amount));
  if (memo) params.set("memo", memo);
  return `web+stellar:pay?destination=${encodeURIComponent(destination)}&${params.toString()}`;
}

export function totalDue(amountDue: number, lateInterest: number): number {
  return Math.max(0, (Number.isFinite(amountDue) ? amountDue : 0) + (Number.isFinite(lateInterest) ? lateInterest : 0));
}

export type TokenFailure = "invalid" | "expired" | "unavailable";

export function classifyTokenFailure(status: number, body: unknown): TokenFailure {
  if (status === 404) return "invalid";
  if (status === 410) return "expired";
  const record = typeof body === "object" && body !== null
    ? (body as Record<string, unknown>)
    : {};
  const code = String(record.code ?? record.error ?? "").toLowerCase();
  if (code.includes("expired")) return "expired";
  if (code.includes("invalid") || code.includes("not_found")) return "invalid";
  return "unavailable";
}
