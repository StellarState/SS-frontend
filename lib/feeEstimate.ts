/**
 * Network fee estimation helpers (issue #654).
 *
 * Kept free of React so the arithmetic and the simulation boundary can be
 * tested directly. A simulation failure is not fatal: callers fall back to the
 * Stellar base fee and still let the user sign.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

/** Minimum network fee in XLM, used when simulation is unavailable. */
export const BASE_NETWORK_FEE_XLM = 0.00001;
/** One base reserve must stay in the account to keep it funded. */
export const BASE_RESERVE_XLM = 1;

export interface TransactionBuilderLike {
  /** Returns the simulated resource fee in XLM, or an object with a `fee`. */
  simulate: () => Promise<number | { fee: number; resource_fee?: number }>;
}

/** Builds a simulator that asks the backend to simulate the pending transaction. */
export function createFeeSimulator(amount: number): TransactionBuilderLike {
  return {
    async simulate() {
      const res = await fetch(`${API_BASE}/fees/estimate?amount=${encodeURIComponent(String(amount))}`);
      if (!res.ok) throw new Error("Fee simulation failed");
      const data = (await res.json()) as { fee?: number; resource_fee?: number };
      const fee = Number(data.fee ?? data.resource_fee);
      if (!Number.isFinite(fee) || fee < 0) throw new Error("Fee simulation returned an invalid fee");
      return fee;
    },
  };
}

export function readSimulatedFee(result: number | { fee: number }): number | null {
  const fee = typeof result === "number" ? result : Number(result.fee);
  return Number.isFinite(fee) && fee >= 0 ? fee : null;
}

export function totalCost(amount: number, platformFee: number, networkFee: number): number {
  return amount + platformFee + networkFee;
}

/** True when the account cannot pay the amount, fees and the base reserve. */
export function cannotCoverFees(
  xlmBalance: number | null,
  amount: number,
  platformFee: number,
  networkFee: number,
  reserve = BASE_RESERVE_XLM,
): boolean {
  if (xlmBalance === null || !Number.isFinite(xlmBalance)) return false;
  return xlmBalance < totalCost(amount, platformFee, networkFee) + reserve;
}
