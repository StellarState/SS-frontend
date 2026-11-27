import * as Sentry from "@sentry/react";
import type { ErrorEvent, EventHint } from "@sentry/react";

export const CONSENT_STORAGE_KEY = "ss-error-reporting-consent";

export const DEFAULT_RELEASE = "stellarsettle-app@0.1.0";

export function getSentryRelease(): string {
  return (
    process.env.NEXT_PUBLIC_SENTRY_RELEASE ||
    process.env.VITE_SENTRY_RELEASE ||
    process.env.npm_package_version ||
    DEFAULT_RELEASE
  );
}

export function getSentryDsn(): string {
  return (
    process.env.NEXT_PUBLIC_SENTRY_DSN ||
    process.env.VITE_SENTRY_DSN ||
    ""
  );
}

export function hasErrorReportingConsent(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const val = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (val === "false") return false;
    // Also support underscore variant
    const valUnderscore = localStorage.getItem("ss_error_reporting_consent");
    if (valUnderscore === "false") return false;
    return true;
  } catch {
    return true;
  }
}

export function setErrorReportingConsent(consent: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, consent ? "true" : "false");
  } catch {
    // ignore
  }
}

// Regex patterns for sensitive financial and cryptographic tokens
const STELLAR_PUBKEY_REGEX = /\b(G[A-Z2-7]{55})\b/g;
const STELLAR_SECRET_REGEX = /\b(S[A-Z2-7]{55})\b/g;
const STELLAR_MUXED_REGEX = /\b(M[A-Z2-7]{68})\b/g;
const EVM_ADDRESS_REGEX = /\b(0x[a-fA-F0-9]{40})\b/g;
const HEX_PRIVATE_KEY_REGEX = /\b(0x[a-fA-F0-9]{64})\b/g;
const JWT_REGEX = /\b(eyJh[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*)\b/g;
const BEARER_TOKEN_REGEX = /Bearer\s+([A-Za-z0-9-_.~+/=]+)/gi;

const SENSITIVE_KEY_REGEX = /^(password|secret|token|seed|mnemonic|tin|taxid|ssn|privatekey|apikey|authorization|cookie|pin)$/i;

/**
 * Scrubs all crypto addresses, secret seeds, JWTs, and Bearer tokens from a string.
 */
export function scrubString(str: string): string {
  if (!str || typeof str !== "string") return str;

  return str
    .replace(STELLAR_SECRET_REGEX, "[SCRUBBED_STELLAR_SECRET]")
    .replace(STELLAR_PUBKEY_REGEX, "[SCRUBBED_STELLAR_PUBKEY]")
    .replace(STELLAR_MUXED_REGEX, "[SCRUBBED_STELLAR_MUXED]")
    .replace(HEX_PRIVATE_KEY_REGEX, "[SCRUBBED_PRIVATE_KEY]")
    .replace(EVM_ADDRESS_REGEX, "[SCRUBBED_EVM_ADDRESS]")
    .replace(BEARER_TOKEN_REGEX, "Bearer [SCRUBBED_TOKEN]")
    .replace(JWT_REGEX, "[SCRUBBED_JWT]");
}

/**
 * Recursively deep-scrubs objects, maps, arrays and strings.
 * Redacts values whose keys match sensitive names (e.g. password, seed, tin).
 */
export function scrubData<T>(data: T, depth = 0): T {
  if (depth > 8 || data === null || data === undefined) return data;

  if (typeof data === "string") {
    return scrubString(data) as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => scrubData(item, depth + 1)) as unknown as T;
  }

  if (typeof data === "object") {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (SENSITIVE_KEY_REGEX.test(key)) {
        cleaned[key] = "[SCRUBBED]";
      } else {
        cleaned[key] = scrubData(value, depth + 1);
      }
    }
    return cleaned as unknown as T;
  }

  return data;
}

/**
 * Sentry beforeSend hook that verifies consent and scrubs all sensitive data.
 */
export function beforeSendScrubber(event: ErrorEvent, hint?: EventHint): ErrorEvent | null {
  // Check telemetry / error reporting consent
  if (!hasErrorReportingConsent()) {
    return null; // Drop event
  }

  // Scrub error messages, values, exceptions
  if (event.message) {
    event.message = scrubString(event.message);
  }

  if (event.exception?.values) {
    for (const exc of event.exception.values) {
      if (exc.value) {
        exc.value = scrubString(exc.value);
      }
    }
  }

  if (event.breadcrumbs) {
    for (const breadcrumb of event.breadcrumbs) {
      if (breadcrumb.message) {
        breadcrumb.message = scrubString(breadcrumb.message);
      }
      if (breadcrumb.data) {
        breadcrumb.data = scrubData(breadcrumb.data);
      }
    }
  }

  if (event.extra) {
    event.extra = scrubData(event.extra);
  }

  if (event.request) {
    if (event.request.headers) {
      event.request.headers = scrubData(event.request.headers);
    }
    if (event.request.data) {
      event.request.data = scrubData(event.request.data);
    }
  }

  return event;
}

/**
 * Initializes Sentry error monitoring with release tagging and scrubbing.
 */
export function initSentry(): void {
  const dsn = getSentryDsn();
  const release = getSentryRelease();

  // If no DSN provided in local dev/tests, we still initialize if DSN exists
  // but don't throw if omitted.
  Sentry.init({
    dsn: dsn || undefined,
    release,
    environment: process.env.NODE_ENV || "development",
    enabled: Boolean(dsn) && hasErrorReportingConsent(),
    beforeSend: beforeSendScrubber,
  });
}

/**
 * Attaches the current route to Sentry tags and context.
 */
export function setRouteContext(route: string): void {
  Sentry.setTag("route", route);
  Sentry.setContext("route", { current: route });
}

/**
 * Attaches wallet and network context to Sentry without exposing raw private keys.
 */
export function setWalletNetworkContext(wallet: {
  address?: string | null;
  network?: string | null;
}): void {
  if (wallet.network) {
    Sentry.setTag("stellar_network", wallet.network);
    Sentry.setContext("stellar_network", { network: wallet.network });
  }

  if (wallet.address) {
    const masked = `${wallet.address.slice(0, 4)}...${wallet.address.slice(-4)}`;
    Sentry.setTag("wallet_connected", "true");
    Sentry.setUser({ id: masked });
  } else {
    Sentry.setTag("wallet_connected", "false");
    Sentry.setUser(null);
  }
}

export interface UserFeedbackParams {
  eventId: string;
  name: string;
  email: string;
  comments: string;
}

/**
 * Submits user feedback linked to a Sentry error event.
 */
export async function sendUserFeedback({
  eventId,
  name,
  email,
  comments,
}: UserFeedbackParams): Promise<void> {
  if (typeof Sentry.captureFeedback === "function") {
    Sentry.captureFeedback({
      associatedEventId: eventId,
      name,
      email,
      message: comments,
    });
  }
}

export { Sentry };
