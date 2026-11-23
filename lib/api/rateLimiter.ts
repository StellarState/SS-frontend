"use client";

import { toast } from "sonner";

interface RateLimitState {
  resetTime: number;
  retryAfter: number;
}

const rateLimitStates = new Map<string, RateLimitState>();
let globalRateLimitHandler: ((state: RateLimitState) => void) | null = null;

export function setGlobalRateLimitHandler(
  handler: (state: RateLimitState) => void
) {
  globalRateLimitHandler = handler;
}

function getEndpointKey(url: string): string {
  try {
    const u = new URL(url, typeof window !== "undefined" ? window.location.origin : "");
    return u.pathname;
  } catch {
    return url;
  }
}

export async function fetchWithRateLimit(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const endpoint = getEndpointKey(url);
  const state = rateLimitStates.get(endpoint);

  if (state && state.resetTime > Date.now()) {
    const waitSeconds = Math.ceil((state.resetTime - Date.now()) / 1000);
    globalRateLimitHandler?.({
      resetTime: state.resetTime,
      retryAfter: waitSeconds,
    });
    throw new Error(`Rate limited. Retry after ${waitSeconds}s`);
  }

  const response = await fetch(url, options);

  if (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After");
    const waitSeconds = retryAfter
      ? parseInt(retryAfter, 10)
      : Math.random() * 5 + 1; // exponential backoff fallback

    const resetTime = Date.now() + waitSeconds * 1000;
    rateLimitStates.set(endpoint, { resetTime, retryAfter: waitSeconds });

    globalRateLimitHandler?.({
      resetTime,
      retryAfter: waitSeconds,
    });

    // Report analytics
    if (typeof window !== "undefined" && typeof window.fetch === "function") {
      navigator?.sendBeacon?.(`/api/analytics/rate-limit`, JSON.stringify({ endpoint }));
    }
  }

  return response;
}

export function getRateLimitState(): RateLimitState | null {
  let earliestState: RateLimitState | null = null;
  for (const state of rateLimitStates.values()) {
    if (state.resetTime > Date.now()) {
      if (!earliestState || state.resetTime < earliestState.resetTime) {
        earliestState = state;
      }
    }
  }
  return earliestState;
}
