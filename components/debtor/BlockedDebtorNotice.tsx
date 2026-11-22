"use client";

import { useDebtorStatus } from "@/hooks/useDebtorStatus";
import { isBlocked } from "@/lib/debtorStatus";

/** Issuer-facing notice that blocks publishing for blocked debtors. */
export function BlockedDebtorNotice({ debtorHash }: { debtorHash?: string | null }) {
  const { data } = useDebtorStatus(debtorHash);
  if (!data || !isBlocked(data.status)) return null;

  return (
    <p className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive" role="alert" data-testid="blocked-debtor-notice">
      This debtor is blocked. You cannot publish a new invoice for them.
    </p>
  );
}
