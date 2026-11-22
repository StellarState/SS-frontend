import { describe, expect, it } from "vitest";
import {
  classifyVerificationFailure,
  EmailVerificationError,
  isValidEmail,
  normalizeEmailVerificationStatus,
} from "@/lib/emailVerification";

describe("email verification helpers (#653)", () => {
  it("validates email addresses for the change form", () => {
    expect(isValidEmail(" user@example.com ")).toBe(true);
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false);
  });

  it("normalises the status response including a pending address", () => {
    expect(
      normalizeEmailVerificationStatus({
        email: "old@example.com",
        verified: false,
        pending_email: "new@example.com",
      }),
    ).toEqual({
      email: "old@example.com",
      verified: false,
      pendingEmail: "new@example.com",
    });
  });

  it("defaults to unverified with no pending email for malformed data", () => {
    expect(normalizeEmailVerificationStatus(null)).toEqual({
      email: "",
      verified: false,
      pendingEmail: null,
    });
  });

  it("distinguishes expired tokens from invalid ones", () => {
    const expired = classifyVerificationFailure(410, { code: "expired" });
    expect(expired).toBeInstanceOf(EmailVerificationError);
    expect(expired.kind).toBe("expired");
    expect(classifyVerificationFailure(400, { code: "bad_token" }).kind).toBe("invalid");
    expect(classifyVerificationFailure(400, { error: "token_expired" }).kind).toBe("expired");
  });
});
