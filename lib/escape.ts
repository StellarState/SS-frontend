/**
 * Protocol escape hatch helpers (#592).
 */

/**
 * Readable messages for errors the escape-hatch contract can return. Matched
 * against the server message so both named Soroban errors
 * ("EscapeNotEnabled") and raw codes ("Error(Contract, #2)") are covered.
 */
const ESCAPE_ERRORS: Array<{ match: RegExp; message: string }> = [
  {
    match: /EscapeNotEnabled|escape[_ ]not[_ ]enabled|Error\(Contract, #1\)/i,
    message: "Escape withdrawals are not open yet. Try again once the countdown ends.",
  },
  {
    match: /AlreadyWithdrawn|already[_ ]withdrawn|Error\(Contract, #2\)/i,
    message: "This position has already been withdrawn.",
  },
  {
    match: /NothingToWithdraw|nothing[_ ]to[_ ]withdraw|Error\(Contract, #3\)/i,
    message: "There is no principal left to recover for this position.",
  },
  {
    match: /NotPaused|not[_ ]paused|Error\(Contract, #4\)/i,
    message: "The protocol is no longer paused — use the normal withdrawal flow instead.",
  },
  {
    match: /InsufficientBalance|insufficient/i,
    message: "The escrow does not hold enough funds to complete this withdrawal right now.",
  },
];

export function escapeErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  for (const { match, message } of ESCAPE_ERRORS) {
    if (match.test(raw)) return message;
  }
  return raw || "The withdrawal could not be completed. Please try again.";
}

/** Milliseconds until escape opens; 0 once it is available. */
export function msUntil(iso: string | null, now: number = Date.now()): number {
  if (!iso) return 0;
  const target = new Date(iso).getTime();
  return Number.isFinite(target) ? Math.max(0, target - now) : 0;
}

/** "2d 03h 14m 09s" style countdown text. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d > 0 ? `${d}d ` : ""}${pad(h)}h ${pad(m)}m ${pad(s)}s`;
}
