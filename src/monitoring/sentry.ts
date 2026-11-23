/**
 * Sentry Error Monitoring & Release Tracking (Issue #761)
 *
 * Provides centralized error monitoring, release tagging, data sanitization,
 * privacy consent gating, route/wallet network context attachment, and user feedback submission.
 */

import * as Sentry from "@sentry/react";

export const CONSENT_STORAGE_KEY = "error_reporting_consent";

export const SENTRY_DSN =
  process.env.VITE_SENTRY_DSN ||
  process.env.NEXT_PUBLIC_SENTRY_DSN ||
  "";

export const SENTRY_RELEASE =
  process.env.VITE_RELEASE ||
  process.env.NEXT_PUBLIC_COMMIT_SHA ||
  process.env.SENTRY_RELEASE ||
  process.env.npm_package_version ||
  "0.1.0";

export const SENTRY_ENVIRONMENT =
  process.env.NODE_ENV || "production";

/**
 * Checks if user has given consent for error reporting telemetry.
 * Defaults to true unless explicitly disabled in localStorage.
 */
export function getConsentStatus(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (stored === null) return true;
    return stored === "true" || stored === "1";
  } catch {
    return true;
  }
}

/**
 * Sets user consent preference for error reporting telemetry.
 */
export function setConsentStatus(consent: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, consent ? "true" : "false");
  } catch {
    // ignore storage access errors
  }
}

/**
 * Regex patterns for sensitive data:
 * - Stellar public key (56 characters, G...)
 * - Stellar secret key (56 characters, S...)
 * - Stellar muxed account (69 characters, M...)
 * - EVM address (0x followed by 40 hex characters)
 * - EVM private key / 32-byte secret (0x followed by 64 hex characters)
 * - Bearer authorization tokens
 * - JWT tokens (header.payload.signature)
 */
const PATTERNS = {
  STELLAR_SECRET: /\bS[A-Za-z0-9]{55}\b/g,
  STELLAR_PUBLIC: /\bG[A-Za-z0-9]{55}\b/g,
  STELLAR_MUXED: /\bM[A-Za-z0-9]{68}\b/g,
  EVM_PRIVATE_KEY: /\b0x[a-fA-F0-9]{64}\b/g,
  EVM_ADDRESS: /\b0x[a-fA-F0-9]{40}\b/g,
  JWT: /\beyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*\b/g,
  BEARER: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
};

const SENSITIVE_KEY_REGEX =
  /(password|passwd|secret|token|api[-_]?key|private[-_]?key|seed|mnemonic|ssn|credit[-_]?card|pin|auth|authorization)/i;

/**
 * Scrubs known sensitive patterns from raw string content.
 */
export function scrubSensitiveString(str: string): string {
  if (typeof str !== "string") return str;

  return str
    .replace(PATTERNS.STELLAR_SECRET, "[REDACTED_STELLAR_SECKEY]")
    .replace(PATTERNS.STELLAR_PUBLIC, "[REDACTED_STELLAR_PUBKEY]")
    .replace(PATTERNS.STELLAR_MUXED, "[REDACTED_STELLAR_MUXED]")
    .replace(PATTERNS.EVM_PRIVATE_KEY, "[REDACTED_PRIVATE_KEY]")
    .replace(PATTERNS.EVM_ADDRESS, "[REDACTED_EVM_ADDRESS]")
    .replace(PATTERNS.JWT, "[REDACTED_JWT]")
    .replace(PATTERNS.BEARER, "Bearer [REDACTED_TOKEN]");
}

/**
 * Recursively sanitizes data objects, stripping sensitive form keys and scrubbing strings.
 */
export function scrubSensitiveData<T>(val: T, key?: string): T {
  if (val === null || val === undefined) return val;

  // Redact matching key names (form inputs, passwords, seed phrases)
  if (key && SENSITIVE_KEY_REGEX.test(key)) {
    return "[REDACTED]" as unknown as T;
  }

  if (typeof val === "string") {
    return scrubSensitiveString(val) as unknown as T;
  }

  if (Array.isArray(val)) {
    return val.map((item) => scrubSensitiveData(item)) as unknown as T;
  }

  if (typeof val === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val)) {
      if (SENSITIVE_KEY_REGEX.test(k)) {
        result[k] = "[REDACTED]";
      } else {
        result[k] = scrubSensitiveData(v, k);
      }
    }
    return result as T;
  }

  return val;
}

/**
 * Sentry beforeSend hook ensuring sensitive data is scrubbed
 * and dropping events entirely when consent is withheld.
 */
export function beforeSendHandler(
  event: Sentry.ErrorEvent,
  _hint?: Sentry.EventHint
): Sentry.ErrorEvent | null {
  // If user declined error reporting, drop the event completely
  if (!getConsentStatus()) {
    return null;
  }

  // Scrub event message
  if (event.message) {
    event.message = scrubSensitiveString(event.message);
  }

  // Scrub exception values and stackframe variables
  if (event.exception?.values) {
    for (const val of event.exception.values) {
      if (val.value) {
        val.value = scrubSensitiveString(val.value);
      }
      if (val.stacktrace?.frames) {
        for (const frame of val.stacktrace.frames) {
          if (frame.vars) {
            frame.vars = scrubSensitiveData(frame.vars);
          }
        }
      }
    }
  }

  // Scrub breadcrumbs
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((crumb) => {
      const copy = { ...crumb };
      if (copy.message) copy.message = scrubSensitiveString(copy.message);
      if (copy.data) copy.data = scrubSensitiveData(copy.data);
      return copy;
    });
  }

  // Scrub extra, contexts, tags, and request payloads
  if (event.extra) event.extra = scrubSensitiveData(event.extra);
  if (event.tags) event.tags = scrubSensitiveData(event.tags);
  if (event.contexts) event.contexts = scrubSensitiveData(event.contexts);
  if (event.request) {
    if (event.request.headers) event.request.headers = scrubSensitiveData(event.request.headers);
    if (event.request.data) event.request.data = scrubSensitiveData(event.request.data);
    if (event.request.query_string && typeof event.request.query_string === "string") {
      event.request.query_string = scrubSensitiveString(event.request.query_string);
    }
  }

  // Scrub user identity fields
  if (event.user) {
    if (event.user.ip_address) delete event.user.ip_address;
    if (event.user.username) event.user.username = scrubSensitiveString(event.user.username);
    if (event.user.email) event.user.email = scrubSensitiveString(event.user.email);
  }

  return event;
}

export interface InitSentryOptions {
  dsn?: string;
  release?: string;
  environment?: string;
  enabled?: boolean;
}

/**
 * Initializes Sentry client with release tracking, environment, and data scrubbing.
 */
export function initSentry(options?: InitSentryOptions): void {
  const dsn = options?.dsn ?? SENTRY_DSN;
  const release = options?.release ?? SENTRY_RELEASE;
  const environment = options?.environment ?? SENTRY_ENVIRONMENT;

  if (!getConsentStatus() || options?.enabled === false) {
    return;
  }

  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    release,
    environment,
    beforeSend: beforeSendHandler,
    sampleRate: 1.0,
    tracesSampleRate: 0.1,
    normalizeDepth: 5,
  });
}

/**
 * Attaches the current active route to the Sentry scope context.
 */
export function setRouteContext(pathname: string): void {
  Sentry.setTag("route", pathname);
  Sentry.setContext("routing", {
    pathname,
    url: typeof window !== "undefined" ? window.location.href : undefined,
  });
}

export interface WalletNetworkDetails {
  network?: string;
  chainId?: string;
  wallet?: string;
  isConnected?: boolean;
}

/**
 * Attaches wallet network context (network, chainId, connection state)
 * without exposing raw wallet addresses or private keys.
 */
export function setWalletNetworkContext(details: WalletNetworkDetails): void {
  if (details.network) Sentry.setTag("wallet_network", details.network);
  if (details.wallet) Sentry.setTag("wallet_type", details.wallet);
  Sentry.setContext("wallet", {
    network: details.network ?? "unknown",
    chainId: details.chainId,
    walletType: details.wallet,
    isConnected: Boolean(details.isConnected),
  });
}

export interface UserFeedbackSubmission {
  eventId: string;
  name?: string;
  email?: string;
  comments: string;
}

/**
 * Submits user feedback linked to an error event ID.
 */
export function sendUserFeedback(feedback: UserFeedbackSubmission): string | undefined {
  try {
    return Sentry.captureFeedback({
      associatedEventId: feedback.eventId,
      name: feedback.name,
      email: feedback.email,
      message: feedback.comments,
      source: "error_boundary_dialog",
    });
  } catch (err) {
    console.error("Failed to submit Sentry user feedback:", err);
    return undefined;
  }
}

// Re-export Sentry error capture primitives safely
export const captureException = (
  ...args: Parameters<typeof Sentry.captureException>
): ReturnType<typeof Sentry.captureException> => Sentry.captureException(...args);

export const captureMessage = (
  ...args: Parameters<typeof Sentry.captureMessage>
): ReturnType<typeof Sentry.captureMessage> => Sentry.captureMessage(...args);

export const setUser = (
  ...args: Parameters<typeof Sentry.setUser>
): ReturnType<typeof Sentry.setUser> => Sentry.setUser(...args);

export const setTag = (
  ...args: Parameters<typeof Sentry.setTag>
): ReturnType<typeof Sentry.setTag> => Sentry.setTag(...args);

export const addBreadcrumb = (
  ...args: Parameters<typeof Sentry.addBreadcrumb>
): ReturnType<typeof Sentry.addBreadcrumb> => Sentry.addBreadcrumb(...args);
