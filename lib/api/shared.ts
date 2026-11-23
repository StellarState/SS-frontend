/**
 * Shared internals for the domain-specific API clients under lib/api.
 *
 * Domain modules import from here instead of the barrel so re-exporting them
 * from lib/api/index.ts cannot introduce a circular import.
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Read a JSON response once, tolerating an empty body and non-JSON errors. */
export async function readApiJson<T>(response: Response): Promise<T> {
  const body = await response.text();
  if (!body) return {} as T;
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new ApiError(response.status, "Malformed API response");
  }
}

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

export function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export function asRecord(payload: unknown): Record<string, unknown> {
  if (typeof payload !== "object" || payload === null) return {};
  return payload as Record<string, unknown>;
}

export function stringFrom(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function numberFrom(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
