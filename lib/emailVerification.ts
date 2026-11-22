/**
 * Email verification flow (issue #653).
 *
 * Pure helpers and the small API surface for sending, confirming and changing
 * a user's email. The old address stays active until the new one is verified,
 * so these calls never overwrite the verified address on their own.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export const RESEND_COOLDOWN_SECONDS = 60;

export type VerificationFailureKind = "expired" | "invalid" | "network";

export class EmailVerificationError extends Error {
  readonly kind: VerificationFailureKind;

  constructor(kind: VerificationFailureKind, message: string) {
    super(message);
    this.name = "EmailVerificationError";
    this.kind = kind;
  }
}

export interface EmailVerificationStatus {
  email: string;
  verified: boolean;
  /** New address awaiting confirmation, while `email` stays active. */
  pendingEmail: string | null;
}

function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Basic, forgiving email check used to enable the change-email form. */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function normalizeEmailVerificationStatus(raw: unknown): EmailVerificationStatus {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    email: typeof source.email === "string" ? source.email : "",
    verified: source.verified === true,
    pendingEmail:
      typeof source.pending_email === "string"
        ? source.pending_email
        : typeof source.pendingEmail === "string"
          ? source.pendingEmail
          : null,
  };
}

export async function fetchEmailVerificationStatus(
  token?: string,
): Promise<EmailVerificationStatus> {
  const res = await fetch(`${API_BASE}/users/me/email/verification`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to load email verification status");
  return normalizeEmailVerificationStatus(await res.json());
}

export async function sendVerificationEmail(
  email?: string,
  token?: string,
): Promise<void> {
  const res = await fetch(`${API_BASE}/users/me/email/verification/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(email ? { email } : {}),
  });
  if (!res.ok) throw new Error("Failed to send verification email");
}

/** Maps a failed confirmation response to the distinct user-facing states. */
export function classifyVerificationFailure(status: number, body: unknown): EmailVerificationError {
  const source = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const code = String(source.code ?? source.error ?? "").toLowerCase();
  const expired =
    status === 410 ||
    code.includes("expired") ||
    code === "token_expired";
  if (expired) {
    return new EmailVerificationError(
      "expired",
      "This verification link has expired. Request a new one.",
    );
  }
  return new EmailVerificationError(
    "invalid",
    "This verification link is invalid.",
  );
}

export async function confirmEmailVerification(
  code: string,
  token?: string,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/users/me/email/verification/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(token) },
      body: JSON.stringify({ token: code }),
    });
  } catch {
    throw new EmailVerificationError("network", "Could not reach the verification service.");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw classifyVerificationFailure(res.status, body);
  }
}

export async function changeEmail(
  newEmail: string,
  password: string,
  token?: string,
): Promise<void> {
  const res = await fetch(`${API_BASE}/users/me/email/change`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ email: newEmail.trim(), password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const source = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    const message = typeof source.message === "string" ? source.message : "Failed to change email";
    throw new Error(message);
  }
}
