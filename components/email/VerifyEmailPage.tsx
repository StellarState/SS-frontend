"use client";

/**
 * Token confirmation screen (issue #653).
 *
 * Handles the four states independently so an expired link never looks like
 * an invalid one. The async callback is held in a ref to keep the effect from
 * re-running when a parent re-renders with a new function identity.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EmailVerificationError } from "@/lib/emailVerification";

export type VerifyEmailState = "verifying" | "success" | "expired" | "invalid" | "missing";

interface VerifyEmailPageProps {
  /** Injected token, primarily for tests. Falls back to `?token=`. */
  token?: string | null;
  onConfirm?: (token: string) => Promise<void>;
}

export function VerifyEmailPage({ token: tokenProp, onConfirm }: VerifyEmailPageProps) {
  const searchParams = useSearchParams();
  const token = tokenProp !== undefined ? tokenProp : searchParams.get("token");
  const [state, setState] = useState<VerifyEmailState>(token ? "verifying" : "missing");
  const confirmRef = useRef(onConfirm);
  confirmRef.current = onConfirm;

  useEffect(() => {
    if (!token) {
      setState("missing");
      return;
    }

    let cancelled = false;
    setState("verifying");

    const run = async () => {
      try {
        if (!confirmRef.current) return;
        await confirmRef.current(token);
        if (!cancelled) setState("success");
      } catch (error) {
        if (cancelled) return;
        if (error instanceof EmailVerificationError) {
          setState(error.kind === "network" ? "invalid" : error.kind);
        } else {
          setState("invalid");
        }
      }
    };
    void run();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <main className="container mx-auto max-w-md px-4 py-16 text-center space-y-4">
      <h1 className="text-2xl font-bold" data-testid="verify-email-heading">
        Email verification
      </h1>

      {state === "verifying" && (
        <p role="status" data-testid="verify-verifying">Verifying your email, please wait...</p>
      )}

      {state === "success" && (
        <div data-testid="verify-success" className="space-y-3">
          <p role="status" className="text-emerald-600">Your email has been verified.</p>
          <Button asChild><Link href="/dashboard/settings/account">Back to account settings</Link></Button>
        </div>
      )}

      {state === "expired" && (
        <div data-testid="verify-expired" className="space-y-3">
          <p role="alert">This verification link has expired.</p>
          <p className="text-sm text-muted-foreground">Request a new one from account settings.</p>
          <Button asChild variant="outline">
            <Link href="/dashboard/settings/account">Go to account settings</Link>
          </Button>
        </div>
      )}

      {state === "invalid" && (
        <div data-testid="verify-invalid" className="space-y-3">
          <p role="alert">This verification link is invalid.</p>
          <Button asChild variant="outline">
            <Link href="/dashboard/settings/account">Go to account settings</Link>
          </Button>
        </div>
      )}

      {state === "missing" && (
        <div data-testid="verify-missing" className="space-y-3">
          <p role="alert">No verification token was provided.</p>
          <Button asChild variant="outline">
            <Link href="/dashboard/settings/account">Go to account settings</Link>
          </Button>
        </div>
      )}
    </main>
  );
}
