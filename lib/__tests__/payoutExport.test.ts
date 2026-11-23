import { describe, expect, it } from "vitest";
import { buildPayoutsCsv } from "../payoutExport";
import type { PayoutRecord } from "../api";

const payout: PayoutRecord = {
  invoiceId: "inv-1",
  sellerName: "Acme, Ltd",
  amountInvested: 100,
  amountReceived: 108,
  yield: 8,
  settledAt: "2026-11-20T00:00:00.000Z",
};

describe("payout CSV", () => {
  it("includes the withheld column and seven-decimal amounts", () => {
    const withReportedWithholding = {
      ...payout,
      amountReceived: 109,
      withholding: { withheld: 1 },
    };
    const csv = buildPayoutsCsv([withReportedWithholding], {
      ratePercentage: 10,
      recipientLabel: "Treasury",
    });
    expect(csv).toContain("Withheld (XLM)");
    expect(csv).toContain("100.0000000");
    expect(csv).toContain("1.0000000");
    expect(csv).toContain('"Acme, Ltd"');
  });

  it("uses zero when no withholding rate is configured", () => {
    const csv = buildPayoutsCsv([payout], null);
    expect(csv).toContain("0.0000000");
  });
});
