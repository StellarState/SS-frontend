/**
 * Proof of Reserves Domain Logic (Issue #677)
 *
 * Reconciles total assets and liabilities, calculates reserve gaps and collateralization ratio,
 * checks snapshot staleness, provides verifiable explorer links, and handles missing attestations safely.
 */

export type ReserveNetwork =
  | "stellar-mainnet"
  | "stellar-testnet"
  | "ethereum"
  | "bank-escrow";

export type ReservesStatus = "fully_backed" | "undercollateralized" | "stale";

export interface ReserveAccount {
  id: string;
  name: string;
  network: ReserveNetwork;
  address: string;
  asset_symbol: string;
  balance: number;
  explorer_url?: string;
  attestation_url?: string | null;
  attestation_provider?: string | null;
  attestation_hash?: string | null;
  has_attestation: boolean;
}

export interface ObligationCategory {
  id: string;
  category_name: string;
  asset_symbol: string;
  obligation_amount: number;
  holder_count: number;
  description: string;
}

export interface ReservesSummary {
  snapshot_id: string;
  snapshot_timestamp: string;
  snapshot_age_text: string;
  is_stale: boolean;
  total_assets: number;
  total_obligations: number;
  reserve_gap: number;
  reserve_ratio: number;
  status: ReservesStatus;
  accounts: ReserveAccount[];
  obligations: ObligationCategory[];
}

export const STALE_THRESHOLD_HOURS = 24;

export function getAccountExplorerUrl(
  network: ReserveNetwork,
  address: string
): string | null {
  if (!address || address.trim() === "") return null;
  switch (network) {
    case "stellar-mainnet":
      return `https://stellar.expert/explorer/public/account/${address}`;
    case "stellar-testnet":
      return `https://stellar.expert/explorer/testnet/account/${address}`;
    case "ethereum":
      return `https://etherscan.io/address/${address}`;
    case "bank-escrow":
    default:
      return null;
  }
}

export function formatSnapshotAge(
  timestampIso: string,
  nowMs: number = Date.now()
): string {
  const dateMs = new Date(timestampIso).getTime();
  if (isNaN(dateMs)) return "Unknown age";

  const diffSec = Math.max(0, Math.floor((nowMs - dateMs) / 1000));
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function computeReservesSummary(
  accounts: ReserveAccount[],
  obligations: ObligationCategory[],
  snapshotTimestampIso: string,
  snapshotId: string = "SNP-CURRENT",
  nowMs: number = Date.now(),
  maxAgeHours: number = STALE_THRESHOLD_HOURS
): ReservesSummary {
  const total_assets = accounts.reduce((acc, a) => acc + (Number(a.balance) || 0), 0);
  const total_obligations = obligations.reduce(
    (acc, o) => acc + (Number(o.obligation_amount) || 0),
    0
  );

  const reserve_gap = total_assets - total_obligations;
  const reserve_ratio =
    total_obligations > 0 ? (total_assets / total_obligations) * 100 : 100;

  const snapshotDateMs = new Date(snapshotTimestampIso).getTime();
  const ageMs = isNaN(snapshotDateMs) ? 0 : Math.max(0, nowMs - snapshotDateMs);
  const is_stale = ageMs > maxAgeHours * 60 * 60 * 1000;

  let status: ReservesStatus = "fully_backed";
  if (is_stale) {
    status = "stale";
  } else if (reserve_gap < 0) {
    status = "undercollateralized";
  }

  // Ensure accounts have verifiable explorer URLs populated if not given
  const hydratedAccounts = accounts.map((acc) => ({
    ...acc,
    explorer_url: acc.explorer_url ?? (getAccountExplorerUrl(acc.network, acc.address) || undefined),
    has_attestation: Boolean(acc.has_attestation && acc.attestation_url),
  }));

  return {
    snapshot_id: snapshotId,
    snapshot_timestamp: snapshotTimestampIso,
    snapshot_age_text: formatSnapshotAge(snapshotTimestampIso, nowMs),
    is_stale,
    total_assets,
    total_obligations,
    reserve_gap,
    reserve_ratio,
    status,
    accounts: hydratedAccounts,
    obligations,
  };
}

export const SAMPLE_RESERVE_ACCOUNTS: ReserveAccount[] = [
  {
    id: "acc-1",
    name: "Stellar Primary Settlement Escrow",
    network: "stellar-mainnet",
    address: "GDUSC4MAINNETESCROWSETTLEPOOL2026771ABCDEF1234567890STLT",
    asset_symbol: "USDC",
    balance: 5250000,
    attestation_url: "https://attestation.stellarsele.org/reports/2026-11-primary.pdf",
    attestation_provider: "Grant Thornton LLP",
    attestation_hash: "0x3a4b9c1d8e7f2a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b",
    has_attestation: true,
  },
  {
    id: "acc-2",
    name: "Stellar Secondary Reserve Vault",
    network: "stellar-mainnet",
    address: "GBVAULTRESERVESTATE2026XLMUSDCPOOL9876543210FEDCBA987654",
    asset_symbol: "USDC",
    balance: 2450000,
    attestation_url: "https://attestation.stellarsele.org/reports/2026-11-secondary.pdf",
    attestation_provider: "Grant Thornton LLP",
    attestation_hash: "0x123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0",
    has_attestation: true,
  },
  {
    id: "acc-3",
    name: "Ethereum Bridge Liquidity Vault",
    network: "ethereum",
    address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    asset_symbol: "USDC",
    balance: 1800000,
    attestation_url: "https://attestation.stellarsele.org/reports/2026-11-eth-bridge.pdf",
    attestation_provider: "BDO Auditing",
    attestation_hash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    has_attestation: true,
  },
  {
    id: "acc-4",
    name: "Audited Custodial Cash Escrow",
    network: "bank-escrow",
    address: "ESCROW-FIDUCIARY-US-ACCOUNT-90812",
    asset_symbol: "USD",
    balance: 1000000,
    attestation_url: null,
    attestation_provider: null,
    attestation_hash: null,
    has_attestation: false,
  },
];

export const SAMPLE_OBLIGATIONS: ObligationCategory[] = [
  {
    id: "obl-1",
    category_name: "Active Invoice Settlements",
    asset_symbol: "USDC",
    obligation_amount: 5100000,
    holder_count: 142,
    description: "Funded settlement escrows awaiting verified supplier payout",
  },
  {
    id: "obl-2",
    category_name: "Investor Liquidity Pool Deposits",
    asset_symbol: "USDC",
    obligation_amount: 3200000,
    holder_count: 580,
    description: "Total pooled principal available for invoice funding commitments",
  },
  {
    id: "obl-3",
    category_name: "Accrued & Unclaimed Yield",
    asset_symbol: "USDC",
    obligation_amount: 850000,
    holder_count: 312,
    description: "Accumulated discount yield ready for immediate investor withdrawal",
  },
  {
    id: "obl-4",
    category_name: "Pending Redemptions & Netting",
    asset_symbol: "USDC",
    obligation_amount: 350000,
    holder_count: 45,
    description: "In-flight redemption queue scheduled for the current settlement cycle",
  },
];
