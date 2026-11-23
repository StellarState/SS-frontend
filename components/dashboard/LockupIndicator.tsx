"use client";

import { Clock, LockKeyhole } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLockupStatus } from "@/hooks/useLockupStatus";

export function LockupIndicator({ expiresAt }: { expiresAt: string | null | undefined }) {
  const status = useLockupStatus(expiresAt);

  if (!status.locked) return null;

  if (status.countdown) {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
        data-testid="lockup-countdown"
      >
        <Clock aria-hidden="true" />
        {status.countdown}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
      title={`Unlocks ${new Date(expiresAt!).toLocaleString()}`}
      data-testid="lockup-badge"
    >
      <LockKeyhole aria-hidden="true" />
      Locked · {status.daysRemaining} day{status.daysRemaining === 1 ? "" : "s"} left
    </Badge>
  );
}
