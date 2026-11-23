/** Investor withholding configuration (#601). */

import { API_BASE, asRecord, numberFrom, readJson, stringFrom } from "./shared";

export interface WithholdingSettings {
  ratePercentage: number;
  recipientLabel: string;
}

/** Returns null when the contract service has no data or is unavailable. */
export async function fetchWithholding(): Promise<WithholdingSettings | null> {
  try {
    const res = await fetch(`${API_BASE}/investor/withholding`);
    if (!res.ok) return null;
    const root = asRecord(await readJson(res));
    const rate = numberFrom(root.rate_percentage ?? root.ratePercentage, Number.NaN);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) return null;
    return {
      ratePercentage: rate,
      recipientLabel: stringFrom(
        root.recipient_label ?? root.recipientLabel,
        "Withholding recipient"
      ),
    };
  } catch {
    return null;
  }
}
