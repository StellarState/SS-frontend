import { describe, it, expect } from "vitest";
import {
  contractExplorerUrl,
  DEFAULT_TRUST_CONFIG,
  normalizeTrustConfig,
} from "@/lib/trust";

describe("trust config helpers (#655)", () => {
  it("normalises public config data and drops malformed entries", () => {
    const config = normalizeTrustConfig({
      contracts: [
        { name: "Registry", network: "mainnet", address: "CABC", version: "3.0.0" },
        { name: "Missing address", network: "testnet" },
        null,
      ],
      audits: [
        { auditor: "Audit Co", date: "2026-01-10", scope: "Vault", reportUrl: "/reports/a.pdf" },
        { auditor: "No report" },
      ],
      custody: "Non-custodial",
    });

    expect(config.contracts).toEqual([
      { name: "Registry", network: "mainnet", address: "CABC", version: "3.0.0" },
    ]);
    expect(config.audits).toHaveLength(1);
    expect(config.custody).toBe("Non-custodial");
    expect(config.kycAml).toBe(DEFAULT_TRUST_CONFIG.kycAml);
  });

  it("defaults to safe text when the response is empty", () => {
    expect(normalizeTrustConfig(null)).toEqual(DEFAULT_TRUST_CONFIG);
  });

  it("uses the public explorer segment for mainnet contracts", () => {
    expect(contractExplorerUrl("CABC", "mainnet")).toBe(
      "https://stellar.expert/explorer/public/contract/CABC",
    );
    expect(contractExplorerUrl("CABC", "testnet")).toBe(
      "https://stellar.expert/explorer/testnet/contract/CABC",
    );
  });
});
