"use client";

import { useEffect, useState } from "react";
import { getRateLimitState } from "@/lib/api/rateLimiter";
import { toast } from "sonner";

export function RateLimitedToast() {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const state = getRateLimitState();
      if (state) {
        const ms = state.resetTime - Date.now();
        const seconds = Math.ceil(ms / 1000);
        setRemaining(Math.max(0, seconds));
      } else {
        setRemaining(null);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (remaining === null) return;
    if (remaining > 0) {
      toast.warning(`Rate limited. Retry in ${remaining}s`, {
        duration: Infinity,
        id: "rate-limit-toast",
      });
    } else {
      toast.dismiss("rate-limit-toast");
    }
  }, [remaining]);

  return null;
}
