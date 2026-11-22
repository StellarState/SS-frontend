"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEmailVerification } from "@/hooks/useEmailVerification";
import { EmailVerificationBanner } from "./EmailVerificationBanner";
import { ChangeEmailModal } from "./ChangeEmailModal";

/** Account-settings surface for verification status and email changes (#653). */
export function EmailVerificationSettings() {
  const {
    status,
    cooldownSeconds,
    resend,
    updateEmail,
    isResending,
    isChangingEmail,
  } = useEmailVerification();
  const [changeOpen, setChangeOpen] = useState(false);

  if (!status) return null;

  return (
    <section className="space-y-4" data-testid="email-verification-settings">
      <EmailVerificationBanner
        email={status.pendingEmail ?? status.email}
        verified={status.verified}
        cooldownSeconds={cooldownSeconds}
        isResending={isResending}
        onResend={() => void resend(status.email)}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
        <div className="text-sm">
          <p className="font-medium">Email address</p>
          <p className="text-muted-foreground">{status.email}</p>
          <Badge variant={status.verified ? "default" : "secondary"} className="mt-1">
            {status.verified ? "Verified" : "Unverified"}
          </Badge>
          {status.pendingEmail && (
            <p className="mt-1 text-muted-foreground">
              Pending verification: {status.pendingEmail}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setChangeOpen(true)}
          disabled={cooldownSeconds > 0}
          data-testid="open-change-email"
        >
          Change email
        </Button>
      </div>

      <ChangeEmailModal
        open={changeOpen}
        onOpenChange={setChangeOpen}
        currentEmail={status.email}
        cooldownSeconds={cooldownSeconds}
        isChanging={isChangingEmail}
        onChangeEmail={updateEmail}
      />
    </section>
  );
}
