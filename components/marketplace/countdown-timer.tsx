"use client";

import { useEffect, useState } from "react";
import { differenceInSeconds } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface CountdownTimerProps {
  deadline: string | null;
  published: boolean;
}

function formatCountdown(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return `${String(days).padStart(2, "0")}:${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Spells the remaining time out, since "00:12:34" is read as a time of day. */
function describeCountdown(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} ${days === 1 ? "day" : "days"}`);
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
  if (days === 0) parts.push(`${minutes} ${minutes === 1 ? "minute" : "minutes"}`);

  return parts.length > 0 ? parts.join(" ") : "less than a minute";
}

export function CountdownTimer({ deadline, published }: CountdownTimerProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!deadline || !published) return;

    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [deadline, published]);

  if (!published || !deadline) return null;

  const deadlineMs = new Date(deadline).getTime();
  const remaining = differenceInSeconds(deadlineMs, now);

  if (remaining <= 0) {
    return (
      <Badge variant="destructive" className="text-xs">
        Expired
      </Badge>
    );
  }

  return (
    <span
      className="font-mono text-sm tabular-nums text-muted-foreground"
      // role="timer" is implicit-live: an assertive live region would fire
      // every minute as the clock ticks, which is pure noise for a screen
      // reader user. The name carries the meaning, the text stays compact.
      aria-label={`Funding closes in ${describeCountdown(remaining)}`}
    >
      {formatCountdown(remaining)}
    </span>
  );
}

export function isExpired(deadline: string | null): boolean {
  if (!deadline) return false;
  return new Date(deadline).getTime() <= Date.now();
}
