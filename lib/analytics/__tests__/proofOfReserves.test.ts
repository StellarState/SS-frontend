import { describe, it, expect } from "vitest";
import {
  computeReservesSummary,
  formatSnapshotAge,
  getAccountExplorerUrl,
  SAMPLE_RESERVE_ACCOUNTS,
  SAMPLE_OBLIGATIONS,
  ReserveAccount,
  ObligationCategory,
} from "../proofOfReserves";

describe("Proof of Reserves logic (#677)", () => {
  it("reconciles total obligations to assets and calculates positive reserve gap (balanced)", () => {
    const nowMs = 1700000000000;
    const timestampIso = new Date(nowMs - 10 * 60 * 1000).toISOString(); // 10m ago

    const summary = computeReservesSummary(
      SAMPLE_RESERVE_ACCOUNTS,
      SAMPLE_OBLIGATIONS,
      timestampIso,
      "SNP-BALANCED",
      nowMs
    );

    expect(summary.total_assets).toBe(10500000);
    expect(summary.total_obligations).toBe(9500000);
    expect(summary.reserve_gap).toBe(1000000); // 10.5M - 9.5M = 1.0M
    expect(summary.reserve_ratio).toBeCloseTo(110.526, 2);
    expect(summary.status).toBe("fully_backed");
    expect(summary.is_stale).toBe(false);
    expect(summary.snapshot_age_text).toBe("10m ago");
  });

  it("calculates numerical deficit when obligations exceed assets (gap state)", () => {
    const nowMs = 1700000000000;
    const timestampIso = new Date(nowMs - 2 * 60 * 60 * 1000).toISOString(); // 2h ago

    const undercollateralizedAccounts: ReserveAccount[] = [
      {
        id: "acc-1",
        name: "Stellar Escrow",
        network: "stellar-mainnet",
        address: "GABCDEF",
        asset_symbol: "USDC",
        balance: 4000000,
        has_attestation: true,
      },
    ];

    const obligations: ObligationCategory[] = [
      {
        id: "obl-1",
        category_name: "Active Claims",
        asset_symbol: "USDC",
        obligation_amount: 5000000,
        holder_count: 50,
        description: "Pending settlements",
      },
    ];

    const summary = computeReservesSummary(
      undercollateralizedAccounts,
      obligations,
      timestampIso,
      "SNP-GAP",
      nowMs
    );

    expect(summary.total_assets).toBe(4000000);
    expect(summary.total_obligations).toBe(5000000);
    expect(summary.reserve_gap).toBe(-1000000);
    expect(summary.reserve_ratio).toBe(80);
    expect(summary.status).toBe("undercollateralized");
    expect(summary.is_stale).toBe(false);
  });

  it("identifies stale snapshot when timestamp exceeds 24 hours", () => {
    const nowMs = 1700000000000;
    const staleTimestampIso = new Date(nowMs - 30 * 60 * 60 * 1000).toISOString(); // 30h ago

    const summary = computeReservesSummary(
      SAMPLE_RESERVE_ACCOUNTS,
      SAMPLE_OBLIGATIONS,
      staleTimestampIso,
      "SNP-STALE",
      nowMs
    );

    expect(summary.is_stale).toBe(true);
    expect(summary.status).toBe("stale");
    expect(summary.snapshot_age_text).toBe("1d ago");
  });

  it("handles missing attestations safely without crash", () => {
    const accountsWithMissingAttestation: ReserveAccount[] = [
      {
        id: "acc-unverified",
        name: "Unverified Reserve",
        network: "bank-escrow",
        address: "BANK-UNVERIFIED-1",
        asset_symbol: "USD",
        balance: 500000,
        attestation_url: null,
        attestation_provider: null,
        attestation_hash: null,
        has_attestation: false,
      },
    ];

    const summary = computeReservesSummary(
      accountsWithMissingAttestation,
      [],
      new Date().toISOString()
    );

    expect(summary.accounts[0].has_attestation).toBe(false);
    expect(summary.accounts[0].attestation_url).toBeNull();
    expect(summary.accounts[0].explorer_url).toBeUndefined();
  });

  it("generates correct verifiable explorer links per network", () => {
    expect(
      getAccountExplorerUrl(
        "stellar-mainnet",
        "GDUSC4MAINNETESCROWSETTLEPOOL2026771ABCDEF1234567890STLT"
      )
    ).toBe(
      "https://stellar.expert/explorer/public/account/GDUSC4MAINNETESCROWSETTLEPOOL2026771ABCDEF1234567890STLT"
    );

    expect(
      getAccountExplorerUrl("stellar-testnet", "GTEST123")
    ).toBe("https://stellar.expert/explorer/testnet/account/GTEST123");

    expect(
      getAccountExplorerUrl("ethereum", "0x742d35Cc6634C0532925a3b844Bc454e4438f44e")
    ).toBe("https://etherscan.io/address/0x742d35Cc6634C0532925a3b844Bc454e4438f44e");

    expect(getAccountExplorerUrl("bank-escrow", "ESCROW123")).toBeNull();
    expect(getAccountExplorerUrl("stellar-mainnet", "")).toBeNull();
  });

  it("formats snapshot age across various elapsed durations", () => {
    const now = 1700000000000;
    expect(formatSnapshotAge(new Date(now - 10000).toISOString(), now)).toBe("just now");
    expect(formatSnapshotAge(new Date(now - 120000).toISOString(), now)).toBe("2m ago");
    expect(formatSnapshotAge(new Date(now - 7200000).toISOString(), now)).toBe("2h ago");
    expect(formatSnapshotAge(new Date(now - 172800000).toISOString(), now)).toBe("2d ago");
    expect(formatSnapshotAge("invalid-date", now)).toBe("Unknown age");
  });
});
