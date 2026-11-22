"use client";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface EmailVerificationBannerProps {
  email: string;
  verified: boolean;
  /** Whole seconds remaining before resend is allowed again. */
  cooldownSeconds?: number;
  isResending?: boolean;
  onResend?: () => void;
}

/** Prompts an unverified user to verify their address (issue #653). */
export function EmailVerificationBanner({
  email,
  verified,
  cooldownSeconds = 0,
  isResending = false,
  onResend,
}: EmailVerificationBannerProps) {
  if (verified) return null;

  const coolingDown = cooldownSeconds > 0;
  const disabled = coolingDown || isResending;

  return (
    <Alert data-testid="email-verification-banner" role="status">
      <AlertTitle>Verify your email</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>
          Your address <strong>{email || "on file"}</strong> is not verified yet.
          Notifications and statements need a verified email.
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={onResend}
          data-testid="resend-verification"
        >
          {isResending
            ? "Sending..."
            : coolingDown
              ? `Resend available in ${cooldownSeconds}s`
              : "Resend verification email"}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
