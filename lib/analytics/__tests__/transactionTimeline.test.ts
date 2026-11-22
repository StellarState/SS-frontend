import { describe, it, expect } from "vitest";
import {
  buildExplorerTxUrl,
  sanitizeDiagnostics,
  evaluateTimelineProgress,
  SAMPLE_COMPLETED_AUDIT,
  SAMPLE_PENDING_AUDIT,
  SAMPLE_FAILED_AUDIT,
  TimelineStage,
} from "../transactionTimeline";

describe("transactionTimeline domain logic (#670)", () => {
  describe("buildExplorerTxUrl", () => {
    it("builds mainnet explorer URL", () => {
      const url = buildExplorerTxUrl("abc123hash", "mainnet");
      expect(url).toBe("https://stellar.expert/explorer/public/tx/abc123hash");
    });

    it("builds testnet explorer URL", () => {
      const url = buildExplorerTxUrl("abc123hash", "testnet");
      expect(url).toBe("https://stellar.expert/explorer/testnet/tx/abc123hash");
    });

    it("returns empty string if hash is missing or whitespace", () => {
      expect(buildExplorerTxUrl("")).toBe("");
      expect(buildExplorerTxUrl("   ")).toBe("");
    });
  });

  describe("sanitizeDiagnostics", () => {
    it("excludes private keys, secrets, tokens, seeds, and passwords", () => {
      const sensitive = {
        clientVersion: "1.0.0",
        privateKey: "SXXXXSECRETKEY",
        privKey: "S1111",
        api_secret: "super-secret-token",
        seedPhrase: "apple banana cherry",
        mnemonicWord: "word",
        userPassword: "password123",
        Authorization: "Bearer eyJhbGciOi...",
        jwtToken: "token123",
        safeMeta: {
          ledgerSeq: 12345,
          nestedSecret: "bad-secret",
          gasLimit: 50000,
        },
      };

      const sanitized = sanitizeDiagnostics(sensitive);

      expect(sanitized.clientVersion).toBe("1.0.0");
      expect(sanitized.privateKey).toBeUndefined();
      expect(sanitized.privKey).toBeUndefined();
      expect(sanitized.api_secret).toBeUndefined();
      expect(sanitized.seedPhrase).toBeUndefined();
      expect(sanitized.mnemonicWord).toBeUndefined();
      expect(sanitized.userPassword).toBeUndefined();
      expect(sanitized.Authorization).toBeUndefined();
      expect(sanitized.jwtToken).toBeUndefined();

      const safeMeta = sanitized.safeMeta as Record<string, unknown>;
      expect(safeMeta.ledgerSeq).toBe(12345);
      expect(safeMeta.gasLimit).toBe(50000);
      expect(safeMeta.nestedSecret).toBeUndefined();
    });
  });

  describe("evaluateTimelineProgress", () => {
    it("evaluates completed audit record", () => {
      const result = evaluateTimelineProgress(SAMPLE_COMPLETED_AUDIT.stages);
      expect(result.isComplete).toBe(true);
      expect(result.hasFailed).toBe(false);
      expect(result.isTerminal).toBe(false);
      expect(result.currentStage).toBe("settled");
    });

    it("evaluates pending in-flight audit record", () => {
      const result = evaluateTimelineProgress(SAMPLE_PENDING_AUDIT.stages);
      expect(result.isComplete).toBe(false);
      expect(result.hasFailed).toBe(false);
      expect(result.isTerminal).toBe(false);
      expect(result.currentStage).toBe("submitted");
    });

    it("evaluates terminal failed audit record", () => {
      const result = evaluateTimelineProgress(SAMPLE_FAILED_AUDIT.stages);
      expect(result.isComplete).toBe(false);
      expect(result.hasFailed).toBe(true);
      expect(result.isTerminal).toBe(true);
      expect(result.currentStage).toBe("confirmed");
    });

    it("returns initiated when all stages are pending", () => {
      const pendingStages: TimelineStage[] = [
        { name: "initiated", label: "Init", status: "pending", sourceLayer: "UI" },
        { name: "signed", label: "Sign", status: "pending", sourceLayer: "UI" },
      ];
      const result = evaluateTimelineProgress(pendingStages);
      expect(result.isComplete).toBe(false);
      expect(result.hasFailed).toBe(false);
      expect(result.currentStage).toBe("initiated");
    });
  });
});
