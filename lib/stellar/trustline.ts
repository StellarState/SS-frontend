/**
 * Trustline submission for the funding guide (#648).
 *
 * A zero asset balance cannot tell "no trustline" from "empty trustline", so
 * the funding step explicitly submits a changeTrust operation when missing.
 * The wallet-specific signer is injected, keeping submission testable and
 * supporting both Freighter and Albedo without coupling to either.
 */

import { Asset, Horizon, Networks, Operation, TransactionBuilder, BASE_FEE } from "stellar-sdk";
import type { Network } from "@/lib/stellar";
import { getDefaultNetwork } from "@/lib/stellar/network";
import { getUsdcAsset } from "./usdc";

const HORIZON_URLS: Record<Network, string> = {
  testnet: "https://horizon-testnet.stellar.org",
  mainnet: "https://horizon.stellar.org",
};

export interface TrustlineSubmitter {
  signTransaction: (xdr: string) => Promise<string | null>;
  horizonUrl?: string;
}

function resolveHorizonUrl(network: Network, override?: string): string {
  if (override) return override.replace(/\/$/, "");
  const fromEnv = process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL;
  if (fromEnv && network === getDefaultNetwork()) return fromEnv.replace(/\/$/, "");
  return HORIZON_URLS[network];
}

/** Submits a changeTrust operation for the investment asset; returns the tx hash. */
export async function addInvestmentTrustline(
  address: string,
  network: Network,
  submitter: TrustlineSubmitter,
): Promise<string> {
  const server = new Horizon.Server(resolveHorizonUrl(network, submitter.horizonUrl));
  const account = await server.loadAccount(address);
  const asset = getUsdcAsset(network);

  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: network === "mainnet" ? Networks.PUBLIC : Networks.TESTNET,
  })
    .addOperation(
      Operation.changeTrust({
        asset: new Asset(asset.assetCode, asset.assetIssuer),
      }),
    )
    .setTimeout(180)
    .build();

  const signedXdr = await submitter.signTransaction(transaction.toXDR());
  if (!signedXdr) throw new Error("Trustline transaction was not signed");

  const submitted = await server.submitTransaction(
    TransactionBuilder.fromXDR(
      signedXdr,
      network === "mainnet" ? Networks.PUBLIC : Networks.TESTNET,
    ),
  );
  return submitted.hash;
}

/** Resolves the wallet-specific signTransaction function for #648. */
export function getWalletSigner(wallet: "freighter" | "albedo" | null | undefined) {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    freighterApi?: { signTransaction: (xdr: string) => Promise<string | null> };
    albedo?: { signTransaction: (options: { xdr: string }) => Promise<{ signedXdr?: string }> };
  };

  if (wallet === "freighter" && w.freighterApi) {
    return { signTransaction: w.freighterApi.signTransaction.bind(w.freighterApi) };
  }
  if (wallet === "albedo" && w.albedo) {
    return {
      signTransaction: async (xdr: string) => {
        const result = await w.albedo!.signTransaction({ xdr });
        return result.signedXdr ?? null;
      },
    };
  }
  return null;
}
