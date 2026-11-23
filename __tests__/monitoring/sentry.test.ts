import { vi, beforeEach, afterEach } from "vitest";
import {
  scrubSensitiveString,
  scrubSensitiveData,
  beforeSendHandler,
  getConsentStatus,
  setConsentStatus,
  setRouteContext,
  setWalletNetworkContext,
  sendUserFeedback,
  initSentry,
  CONSENT_STORAGE_KEY,
} from "@/src/monitoring/sentry";
import * as Sentry from "@sentry/react";

vi.mock("@sentry/react", () => {
  return {
    init: vi.fn(),
    captureException: vi.fn().mockReturnValue("mock-event-id-1234"),
    captureMessage: vi.fn(),
    setTag: vi.fn(),
    setContext: vi.fn(),
    setUser: vi.fn(),
    addBreadcrumb: vi.fn(),
    captureFeedback: vi.fn().mockReturnValue("feedback-id-5678"),
  };
});

describe("Sentry Error Monitoring - Sanitization & Consent (Issue #761)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("scrubSensitiveString", () => {
    it("scrubs Stellar public keys (G...)", () => {
      const pubKey = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
      const raw = `User account failed: ${pubKey}`;
      const scrubbed = scrubSensitiveString(raw);
      expect(scrubbed).not.toContain(pubKey);
      expect(scrubbed).toContain("[REDACTED_STELLAR_PUBKEY]");
    });

    it("scrubs Stellar secret keys (S...)", () => {
      const secKey = "SB3K72J2G5P5R2B7R54L2V4N6J7P9R2B7R54L2V4N6J7P9R2B7R54L2V";
      const raw = `Fatal: invalid signer key ${secKey}`;
      const scrubbed = scrubSensitiveString(raw);
      expect(scrubbed).not.toContain(secKey);
      expect(scrubbed).toContain("[REDACTED_STELLAR_SECKEY]");
    });

    it("scrubs Stellar muxed accounts (M...)", () => {
      const muxed = "MA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVAAAAAAAAAAAAAJLK";
      const raw = `Destination: ${muxed}`;
      const scrubbed = scrubSensitiveString(raw);
      expect(scrubbed).not.toContain(muxed);
      expect(scrubbed).toContain("[REDACTED_STELLAR_MUXED]");
    });

    it("scrubs EVM addresses (0x...)", () => {
      const ethAddress = "0x53Eb00b639e3e7fD2E55faB322495d4371faB65a";
      const raw = `Receiver eth address is ${ethAddress} for payout`;
      const scrubbed = scrubSensitiveString(raw);
      expect(scrubbed).not.toContain(ethAddress);
      expect(scrubbed).toContain("[REDACTED_EVM_ADDRESS]");
    });

    it("scrubs EVM 32-byte hex private keys", () => {
      const privKey = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
      const raw = `Key dump: ${privKey}`;
      const scrubbed = scrubSensitiveString(raw);
      expect(scrubbed).not.toContain(privKey);
      expect(scrubbed).toContain("[REDACTED_PRIVATE_KEY]");
    });

    it("scrubs Bearer tokens and JWTs", () => {
      const bearer = "Bearer secret-token-abc.xyz.123";
      const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";
      const raw = `Auth header: ${bearer}, payload: ${jwt}`;
      const scrubbed = scrubSensitiveString(raw);

      expect(scrubbed).toContain("Bearer [REDACTED_TOKEN]");
      expect(scrubbed).toContain("[REDACTED_JWT]");
      expect(scrubbed).not.toContain("secret-token-abc");
    });

    it("preserves non-sensitive error messages", () => {
      const msg = "Network timeout: failed to fetch invoice #124 from Horizon";
      expect(scrubSensitiveString(msg)).toBe(msg);
    });
  });

  describe("scrubSensitiveData (Recursive Object/Key Sanitization)", () => {
    it("redacts sensitive dictionary keys such as passwords, secrets, seed phrases", () => {
      const payload = {
        username: "testuser",
        password: "SuperSecretPassword123!",
        privateKey: "0x123456",
        seedPhrase: "twelve random words secret mnemonic phrase",
        apiKey: "api_prod_998877",
        settings: {
          auth_token: "my-jwt-here",
          theme: "dark",
        },
      };

      const sanitized = scrubSensitiveData(payload);
      expect(sanitized.password).toBe("[REDACTED]");
      expect(sanitized.privateKey).toBe("[REDACTED]");
      expect(sanitized.seedPhrase).toBe("[REDACTED]");
      expect(sanitized.apiKey).toBe("[REDACTED]");
      expect(sanitized.settings.auth_token).toBe("[REDACTED]");
      expect(sanitized.username).toBe("testuser");
      expect(sanitized.settings.theme).toBe("dark");
    });

    it("scrubs sensitive strings embedded inside nested arrays and objects", () => {
      const payload = {
        traces: [
          "Started transaction",
          "Signer: GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
        ],
        details: {
          errorText: "Failed with 0x53Eb00b639e3e7fD2E55faB322495d4371faB65a",
        },
      };

      const sanitized = scrubSensitiveData(payload);
      expect(sanitized.traces[1]).toContain("[REDACTED_STELLAR_PUBKEY]");
      expect(sanitized.details.errorText).toContain("[REDACTED_EVM_ADDRESS]");
    });
  });

  describe("Consent Gating & beforeSendHandler", () => {
    it("returns null in beforeSendHandler when consent is disabled", () => {
      setConsentStatus(false);
      expect(getConsentStatus()).toBe(false);

      const mockEvent: Sentry.ErrorEvent = {
        type: undefined,
        message: "Something broke",
        timestamp: 123456789,
        level: "error",
      };

      const result = beforeSendHandler(mockEvent);
      expect(result).toBeNull();
    });

    it("processes and scrubs event in beforeSendHandler when consent is granted", () => {
      setConsentStatus(true);
      expect(getConsentStatus()).toBe(true);

      const mockEvent: Sentry.ErrorEvent = {
        type: undefined,
        message: "Wallet error for GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
        breadcrumbs: [
          {
            message: "User clicked with 0x53Eb00b639e3e7fD2E55faB322495d4371faB65a",
            data: { secret_seed: "test-seed", normal_field: "ok" },
          },
        ],
        extra: {
          bearer: "Bearer my-secret-auth-token-12345",
        },
        user: {
          id: "u-123",
          ip_address: "192.168.1.1",
        },
      };

      const result = beforeSendHandler(mockEvent);
      expect(result).not.toBeNull();
      expect(result?.message).toContain("[REDACTED_STELLAR_PUBKEY]");
      expect(result?.breadcrumbs?.[0].message).toContain("[REDACTED_EVM_ADDRESS]");
      expect(result?.breadcrumbs?.[0].data?.secret_seed).toBe("[REDACTED]");
      expect(result?.breadcrumbs?.[0].data?.normal_field).toBe("ok");
      expect(result?.extra?.bearer).toContain("Bearer [REDACTED_TOKEN]");
      expect(result?.user?.ip_address).toBeUndefined();
    });

    it("respects default consent state when no storage entry is set", () => {
      localStorage.removeItem(CONSENT_STORAGE_KEY);
      expect(getConsentStatus()).toBe(true);
    });
  });

  describe("Route and Wallet Network Contexts", () => {
    it("sets route tag and routing context", () => {
      setRouteContext("/marketplace");
      expect(Sentry.setTag).toHaveBeenCalledWith("route", "/marketplace");
      expect(Sentry.setContext).toHaveBeenCalledWith("routing", expect.objectContaining({
        pathname: "/marketplace",
      }));
    });

    it("sets wallet network context without leaking secret keys", () => {
      setWalletNetworkContext({
        network: "testnet",
        chainId: "stellar-testnet-1",
        wallet: "freighter",
        isConnected: true,
      });

      expect(Sentry.setTag).toHaveBeenCalledWith("wallet_network", "testnet");
      expect(Sentry.setTag).toHaveBeenCalledWith("wallet_type", "freighter");
      expect(Sentry.setContext).toHaveBeenCalledWith("wallet", {
        network: "testnet",
        chainId: "stellar-testnet-1",
        walletType: "freighter",
        isConnected: true,
      });
    });
  });

  describe("User Feedback Submission", () => {
    it("submits feedback linked to error eventId", () => {
      const feedbackId = sendUserFeedback({
        eventId: "event-abc-999",
        name: "Alice",
        email: "alice@stellarsettle.org",
        comments: "Invoice submission hung on signing step",
      });

      expect(Sentry.captureFeedback).toHaveBeenCalledWith({
        associatedEventId: "event-abc-999",
        name: "Alice",
        email: "alice@stellarsettle.org",
        message: "Invoice submission hung on signing step",
        source: "error_boundary_dialog",
      });
      expect(feedbackId).toBe("feedback-id-5678");
    });
  });

  describe("initSentry", () => {
    it("does not initialize if consent is disabled", () => {
      setConsentStatus(false);
      initSentry({ dsn: "https://mock@sentry.io/123" });
      expect(Sentry.init).not.toHaveBeenCalled();
    });

    it("initializes with DSN, release and beforeSend when enabled", () => {
      setConsentStatus(true);
      initSentry({
        dsn: "https://mock@sentry.io/123",
        release: "0.2.0-test",
        environment: "staging",
      });

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: "https://mock@sentry.io/123",
          release: "0.2.0-test",
          environment: "staging",
          beforeSend: beforeSendHandler,
        })
      );
    });
  });
});
