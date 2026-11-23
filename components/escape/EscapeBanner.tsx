"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { useEscapeStatus, useLiveCountdown } from "@/hooks/useEscapeStatus";
import { formatCountdown } from "@/lib/escape";

/**
 * Shown on every page while the protocol is paused (#592). Counts down to the
 * moment the escape hatch opens, then points investors at /escape.
 */
export function EscapeBanner() {
  const { isPaused, escapeEnabled, escapeAvailableAt } = useEscapeStatus();
  const remainingMs = useLiveCountdown(isPaused && !escapeEnabled ? escapeAvailableAt : null);

  if (!isPaused && !escapeEnabled) return null;

  return (
    <div
      className="border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-900 dark:text-amber-200"
      role="status"
      data-testid="escape-banner"
    >
      <div className="container mx-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        {escapeEnabled ? (
          <>
            <span data-testid="escape-banner-open">
              The protocol is paused and emergency withdrawals are open.
            </span>
            <Link href="/escape" className="font-semibold underline underline-offset-4" data-testid="escape-banner-link">
              Recover your principal
            </Link>
          </>
        ) : (
          <span data-testid="escape-banner-paused">
            The protocol is paused.{" "}
            {escapeAvailableAt ? (
              <>
                Emergency withdrawals open in{" "}
                <span className="font-mono font-semibold" data-testid="escape-countdown">
                  {formatCountdown(remainingMs)}
                </span>
                .
              </>
            ) : (
              "Emergency withdrawals will open if the pause continues."
            )}
          </span>
        )}
      </div>
    </div>
  );
}
