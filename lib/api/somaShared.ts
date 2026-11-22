/**
 * Shared internals for the Soma-owned API modules.
 *
 * Kept separate from the main API barrel so these modules can be re-exported
 * without creating circular imports.
 */

export const SOMA_API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export async function readSomaJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export function somaRecord(payload: unknown): Record<string, unknown> {
  if (typeof payload !== "object" || payload === null) return {};
  return payload as Record<string, unknown>;
}

export function somaString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function somaNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
