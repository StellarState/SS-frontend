import { describe, expect, it } from "vitest";

import {
  BASE_RESERVE_XLM,
  fetchWalletBalances,
  parseAccountBalances,
  requiredReserveXlm,
} from "../stellar/balances";
import { getUsdcAsset } from "../stellar/usdc";
import type { HorizonBalance } from "../stellar/balances";

const asset = getUsdcAsset("testnet");

function account(balances: HorizonBalance[]) {
  return { balances };
}

describe("wallet balances", () => {
  it("reports an unfunded account with no trustline", () => {
    expect(parseAccountBalances(account([]), "testnet")).toEqual({
      xlm: 0,
      asset: 0,
      hasTrustline: false,
      reserveXlm: BASE_RESERVE_XLM,
    });
  });

  it("reads native XLM and the investment asset balance", () => {
    const result = parseAccountBalances(
      account([
        { asset_type: "native", balance: "12.5" },
        {
          asset_type: "credit_alphanum4",
          asset_code: asset.assetCode,
          asset_issuer: asset.assetIssuer,
          balance: "250.75",
          limit: "1000000",
        },
      ]),
      "testnet",
    );
    expect(result).toEqual({
      xlm: 12.5,
      asset: 250.75,
      hasTrustline: true,
      reserveXlm: BASE_RESERVE_XLM,
    });
  });

  it("detects an empty trustline as present", () => {
    const result = parseAccountBalances(
      account([
        { asset_type: "native", balance: "3" },
        {
          asset_type: "credit_alphanum4",
          asset_code: asset.assetCode,
          asset_issuer: asset.assetIssuer,
          balance: "0",
          limit: "1000000",
        },
      ]),
      "testnet",
    );
    expect(result.hasTrustline).toBe(true);
    expect(result.asset).toBe(0);
  });

  it("ignores a similarly named asset from a different issuer", () => {
    const result = parseAccountBalances(
      account([
        { asset_type: "native", balance: "3" },
        {
          asset_type: "credit_alphanum4",
          asset_code: asset.assetCode,
          asset_issuer: "GWRONGISSUER",
          balance: "99",
        },
      ]),
      "testnet",
    );
    expect(result.hasTrustline).toBe(false);
    expect(result.asset).toBe(0);
  });

  it("reports the correct minimum reserve before and after the trustline", () => {
    expect(requiredReserveXlm(false)).toBe(1);
    expect(requiredReserveXlm(true)).toBe(2);
  });

  it("returns zeros for a 404 unfunded account", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ status: 404, ok: false })));
    await expect(fetchWalletBalances(VALID_ADDRESS, "testnet")).resolves.toMatchObject({
      xlm: 0,
      hasTrustline: false,
    });
    vi.unstubAllGlobals();
  });

  it("reads balances from Horizon", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        status: 200,
        ok: true,
        json: async () =>
          account([
            { asset_type: "native", balance: "5.5" },
            {
              asset_type: "credit_alphanum4",
              asset_code: asset.assetCode,
              asset_issuer: asset.assetIssuer,
              balance: "10",
            },
          ]),
      })),
    );
    await expect(fetchWalletBalances(VALID_ADDRESS, "testnet")).resolves.toMatchObject({
      xlm: 5.5,
      asset: 10,
      hasTrustline: true,
    });
    vi.unstubAllGlobals();
  });
});

const VALID_ADDRESS = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
