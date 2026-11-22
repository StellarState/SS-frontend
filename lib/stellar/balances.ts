/**
 * Native XLM and investment-asset balances via Horizon (#648).
 *
 * A single account fetch returns all three facts the funding steps need:
 * the XLM available for reserve/fees, the asset balance, and whether the
 * trustline exists (which a zero balance alone cannot distinguish).
 */

import type { Network } from "@/lib/stellar";
import { getDefaultNetwork } from "@/lib/stellar/network";
import { getUsdcAsset } from "./usdc";

/** Stellar base reserve per ledger entry (XLM). */
export const BASE_RESERVE_XLM = 1;

const HORIZON_URLS: Record<Network, string> = {
  testnet: "https://horizon-testnet.stellar.org",
  mainnet: "https://horizon.stellar.org",
};

export interface HorizonBalance {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
  balance: string;
  limit?: string;
}

export interface WalletBalances {
  xlm: number;
  asset: number;
  hasTrustline: boolean;
  reserveXlm: number;
}

function resolveHorizonUrl(network: Network): string {
  const fromEnv = process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL;
  if (fromEnv && network === getDefaultNetwork()) return fromEnv.replace(/\/$/, "");
  return HORIZON_URLS[network];
}

function toNumber(value: string | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Parses a Horizon account response into the funding-step balances. */
export function parseAccountBalances(
  account: { balances?: HorizonBalance[] } | null | undefined,
  network: Network,
): WalletBalances {
  const balances = account?.balances ?? [];
  const asset = getUsdcAsset(network);
  const trustline = balances.find(
    (entry) =>
      (entry.asset_type === "credit_alphanum4" || entry.asset_type === "credit_alphanum12") &&
      entry.asset_code === asset.assetCode &&
      entry.asset_issuer === asset.assetIssuer,
  );
  const native = balances.find((entry) => entry.asset_type === "native");

  return {
    xlm: toNumber(native?.balance),
    asset: toNumber(trustline?.balance),
    hasTrustline: Boolean(trustline),
    reserveXlm: BASE_RESERVE_XLM,
  };
}

/**
 * Minimum XLM to hold before investing: one base reserve for the account,
 * plus one for the investment trustline once it exists.
 */
export function requiredReserveXlm(hasTrustline: boolean): number {
  return (hasTrustline ? 2 : 1) * BASE_RESERVE_XLM;
}

/** Fetches balances; an unfunded account (404) is a valid zero state. */
export async function fetchWalletBalances(
  address: string,
  network: Network = "testnet",
): Promise<WalletBalances> {
  if (!address) {
    return { xlm: 0, asset: 0, hasTrustline: false, reserveXlm: BASE_RESERVE_XLM };
  }

  const url = `${resolveHorizonUrl(network)}/accounts/${encodeURIComponent(address)}`;
  const res = await fetch(url);

  if (res.status === 404) {
    return { xlm: 0, asset: 0, hasTrustline: false, reserveXlm: BASE_RESERVE_XLM };
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch wallet balances (${res.status})`);
  }

  return parseAccountBalances((await res.json()) as { balances?: HorizonBalance[] }, network);
}
