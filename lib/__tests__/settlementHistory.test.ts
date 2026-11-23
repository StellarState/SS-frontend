import { describe, expect, it } from "vitest";
import {
  buildSettlementHistory,
  filterSettlementHistory,
  settlementHistoryCsv,
} from "@/lib/settlementHistory";
import type { SettlementResponse } from "@/hooks/useSettlements";

const data: SettlementResponse = {
  claimable: [{
    invoice_id: "claimable-1", invoice_title: "New, Invoice", invested_amount: 1000,
    return_amount: 1120, net_profit: 120, settled_at: "2026-05-10T10:00:00Z",
    fractions_held: 10, principal_returned: 1000, yield_earned: 130,
    fees_deducted: 10, invoice_type: "Trade finance",
  }],
  claimed_history: [{
    invoice_id: "claimed-1", invoice_title: "Paid invoice", invested_amount: 500,
    claimed_amount: 550, claimed_at: "2026-04-01T10:00:00Z", tx_hash: "tx",
    fractions_held: 5, invoice_type: "Agriculture",
  }],
  total_claimable: 1120,
  total_claimed: 550,
};

describe("settlement history", () => {
  it("includes claimable and claimed payouts, sorted newest first, with fee-adjusted returns", () => {
    const rows = buildSettlementHistory(data);
    expect(rows.map((row) => row.invoiceId)).toEqual(["claimable-1", "claimed-1"]);
    expect(rows[0]).toMatchObject({ fractionsHeld: 10, principalReturned: 1000, yieldEarned: 130, feesDeducted: 10, netReturn: 120 });
    expect(rows[1].netReturn).toBe(50);
  });

  it("filters inclusively by date range and invoice type", () => {
    const rows = buildSettlementHistory(data);
    expect(filterSettlementHistory(rows, {
      from: "2026-05-10", to: "2026-05-10", invoiceType: "Trade finance",
    }).map((row) => row.invoiceId)).toEqual(["claimable-1"]);
  });

  it("exports every requested field and escapes CSV punctuation", () => {
    const csv = settlementHistoryCsv(buildSettlementHistory(data));
    expect(csv).toContain('"New, Invoice"');
    expect(csv.split("\r\n")[0]).toContain("Fractions held");
    expect(csv).toContain('"10"');
    expect(csv).toContain('"120"');
  });
});
