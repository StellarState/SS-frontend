import { describe, it, expect, beforeEach, vi } from "vitest";
import * as Sentry from "@sentry/react";
import {
  scrubString,
  scrubData,
  beforeSendScrubber,
  hasErrorReportingConsent,
  setErrorReportingConsent,
  setRouteContext,
  setWalletNetworkContext,
  sendUserFeedback,
  CONSENT_STORAGE_KEY,
  getSentryRelease,
  DEFAULT_RELEASE,
} from "@/src/monitoring/sentry";
import type { ErrorEvent } from "@sentry/react";

vi.mock("@sentry/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sentry/react")>();
  return {
    ...actual,
    setTag: vi.fn(),
    setContext: vi.fn(),
    setUser: vi.fn(),
    captureFeedback: vi.fn(),
    captureException: vi.fn().mockReturnValue("event-mock-id"),
  };
});

describe("Sentry Error Monitoring & Data Scrubbing (Issue #761)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("String and Token Scrubbing", () => {
    it("scrubs Stellar public keys (G...)", () => {
      const pubkey = "GBVOL6UBVR5S7GDOB4N627WRK4G24D6SOHR2JXZB6TVO223J25E47G23";
      const input = `Transaction failed for account ${pubkey} on ledger`;
      const result = scrubString(input);
      expect(result).not.toContain(pubkey);
      expect(result).toContain("[SCRUBBED_STELLAR_PUBKEY]");
    });

    it("scrubs Stellar secret seeds (S...)", () => {
      const secret = "SBO4T26PYUUSC2SGY725662KCJG2QZ2V73H5RXZD76R2X2D3O5A76H23";
      const input = `Signing with seed ${secret}`;
      const result = scrubString(input);
      expect(result).not.toContain(secret);
      expect(result).toContain("[SCRUBBED_STELLAR_SECRET]");
    });

    it("scrubs Stellar muxed accounts (M...)", () => {
      const muxed = "MA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVAAAAAAAAAAAAAJLK";
      const input = `Sent to muxed address: ${muxed}`;
      const result = scrubString(input);
      expect(result).not.toContain(muxed);
      expect(result).toContain("[SCRUBBED_STELLAR_MUXED]");
    });

    it("scrubs EVM addresses (0x...)", () => {
      const eth = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
      const input = `Bridge transfer to recipient ${eth}`;
      const result = scrubString(input);
      expect(result).not.toContain(eth);
      expect(result).toContain("[SCRUBBED_EVM_ADDRESS]");
    });

    it("scrubs hex private keys (64 hex characters)", () => {
      const privKey = "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d";
      const input = `Key: ${privKey}`;
      const result = scrubString(input);
      expect(result).not.toContain(privKey);
      expect(result).toContain("[SCRUBBED_PRIVATE_KEY]");
    });

    it("scrubs Bearer tokens and JWTs", () => {
      const jwt = "eyJhGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4ifQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
      const authHeader = `Bearer ${jwt}`;
      const result = scrubString(`Authorization: ${authHeader}`);
      expect(result).not.toContain(jwt);
      expect(result).toContain("Bearer [SCRUBBED_TOKEN]");
    });
  });

  describe("Object & Form Values Scrubbing", () => {
    it("redacts sensitive keys from objects and nested structures", () => {
      const payload = {
        username: "investor_1",
        password: "super_secret_password",
        tin: "123-45-6789",
        apiKey: "ak_live_998877665544",
        nested: {
          seed: "SBO4T26PYUUSC2SGY725662KCJG2QZ2V73H5RXZD76R2X2D3O5A76H23",
          description: "Normal invoice purchase",
        },
      };

      const cleaned = scrubData(payload);
      expect(cleaned.password).toBe("[SCRUBBED]");
      expect(cleaned.tin).toBe("[SCRUBBED]");
      expect(cleaned.apiKey).toBe("[SCRUBBED]");
      expect(cleaned.nested.seed).toBe("[SCRUBBED]");
      expect(cleaned.nested.description).toBe("Normal invoice purchase");
      expect(cleaned.username).toBe("investor_1");
    });
  });

  describe("beforeSend Hook and Consent Gating", () => {
    it("drops events when telemetry consent is disabled", () => {
      setErrorReportingConsent(false);
      expect(hasErrorReportingConsent()).toBe(false);

      const event = {
        type: undefined,
        message: "Something failed",
        level: "error",
      } as ErrorEvent;

      const result = beforeSendScrubber(event);
      expect(result).toBeNull();
    });

    it("scrubs event message, breadcrumbs, and extra when consent is active", () => {
      setErrorReportingConsent(true);
      expect(hasErrorReportingConsent()).toBe(true);

      const secret = "SBO4T26PYUUSC2SGY725662KCJG2QZ2V73H5RXZD76R2X2D3O5A76H23";
      const event = {
        type: undefined,
        message: `Error signing with ${secret}`,
        exception: {
          values: [
            {
              type: "SigningError",
              value: `Key invalid: ${secret}`,
            },
          ],
        },
        breadcrumbs: [
          {
            message: `User clicked submit with ${secret}`,
            data: { password: "plain_password", invoiceId: "inv-100" },
          },
        ],
        extra: {
          secretSeed: secret,
          tin: "999-88-7777",
          page: "/invoices/100",
        },
      } as ErrorEvent;

      const result = beforeSendScrubber(event);
      expect(result).not.toBeNull();
      expect(result?.message).toContain("[SCRUBBED_STELLAR_SECRET]");
      expect(result?.message).not.toContain(secret);

      expect(result?.exception?.values?.[0].value).toContain("[SCRUBBED_STELLAR_SECRET]");
      expect(result?.breadcrumbs?.[0].message).toContain("[SCRUBBED_STELLAR_SECRET]");
      expect(result?.breadcrumbs?.[0].data?.password).toBe("[SCRUBBED]");

      expect(result?.extra?.tin).toBe("[SCRUBBED]");
      expect(result?.extra?.page).toBe("/invoices/100");
    });
  });

  describe("Context and Tagging", () => {
    it("attaches route context", () => {
      setRouteContext("/marketplace");
      expect(Sentry.setTag).toHaveBeenCalledWith("route", "/marketplace");
      expect(Sentry.setContext).toHaveBeenCalledWith("route", { current: "/marketplace" });
    });

    it("attaches wallet context without exposing full address", () => {
      const pubkey = "GBVOL6UBVR5S7GDOB4N627WRK4G24D6SOHR2JXZB6TVO223J25E47G23";
      setWalletNetworkContext({ address: pubkey, network: "testnet" });

      expect(Sentry.setTag).toHaveBeenCalledWith("stellar_network", "testnet");
      expect(Sentry.setTag).toHaveBeenCalledWith("wallet_connected", "true");
      expect(Sentry.setUser).toHaveBeenCalledWith({ id: "GBVO...7G23" });
    });

    it("handles disconnected wallet context", () => {
      setWalletNetworkContext({ address: null, network: "public" });
      expect(Sentry.setTag).toHaveBeenCalledWith("wallet_connected", "false");
      expect(Sentry.setUser).toHaveBeenCalledWith(null);
    });
  });

  describe("Feedback Submission", () => {
    it("submits feedback linked to eventId", async () => {
      await sendUserFeedback({
        eventId: "event-123456",
        name: "Alice",
        email: "alice@example.com",
        comments: "Page failed when pressing submit",
      });

      expect(Sentry.captureFeedback).toHaveBeenCalledWith({
        associatedEventId: "event-123456",
        name: "Alice",
        email: "alice@example.com",
        message: "Page failed when pressing submit",
      });
    });
  });
});
