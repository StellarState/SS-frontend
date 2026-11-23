import { describe, it, expect } from "vitest";
import {
  calculateCollateralHealth,
  previewCollateralAction,
  executeCollateralTopUp,
  executeCollateralWithdrawal,
  type CollateralPosition,
  MIN_COLLATERAL_RATIO_PERCENT,
  LIQUIDATION_THRESHOLD_PERCENT,
  WARNING_THRESHOLD_PERCENT,
} from "../collateralHealth";

describe("collateralHealth analytics (#683)", () => {
  const healthyPosition: CollateralPosition = {
    id: "pos-1",
    invoice_id: "inv-600",
    borrower_address: "GBBORROWER123",
    outstanding_debt_xlm: 50000,
    current_collateral_xlm: 75000,
    collateral_asset: "XLM",
    valuation_model: "mark_to_market",
    haircut_percent: 15.0,
    effective_collateral_value: 75000,
    required_collateral_value: 60000, // 50k * 120%
    buffer_amount_xlm: 15000,
    current_health_ratio_percent: 150.0,
    health_status: "healthy",
  };

  const warningPosition: CollateralPosition = {
    ...healthyPosition,
    current_collateral_xlm: 65000,
    effective_collateral_value: 65000,
    buffer_amount_xlm: 5000,
    current_health_ratio_percent: 130.0,
    health_status: "warning",
  };

  const criticalPosition: CollateralPosition = {
    ...healthyPosition,
    current_collateral_xlm: 52000,
    effective_collateral_value: 52000,
    buffer_amount_xlm: -8000,
    current_health_ratio_percent: 104.0,
    health_status: "critical",
  };

  describe("Valuation models and health ratio (Health uses the configured valuation model)", () => {
    it("calculates mark-to-market valuation with no haircut", () => {
      const res = calculateCollateralHealth(50000, 75000, "mark_to_market");
      expect(res.effectiveCollateralValue).toBe(75000);
      expect(res.requiredCollateralValue).toBe(60000); // 120% of 50k
      expect(res.bufferAmountXlm).toBe(15000);
      expect(res.healthRatioPercent).toBe(150.0);
      expect(res.status).toBe("healthy");
    });

    it("calculates haircut-adjusted valuation applying configured discount", () => {
      // 75,000 with 15% haircut = 63,750 effective value
      const res = calculateCollateralHealth(50000, 75000, "haircut_adjusted", 15.0);
      expect(res.effectiveCollateralValue).toBe(63750);
      expect(res.requiredCollateralValue).toBe(60000);
      expect(res.bufferAmountXlm).toBe(3750);
      expect(res.healthRatioPercent).toBe(127.5);
      expect(res.status).toBe("warning"); // <= 135% is warning
    });

    it("categorizes critical state when ratio falls to or below liquidation threshold", () => {
      const res = calculateCollateralHealth(50000, 54000, "mark_to_market");
      // 54k / 50k = 108% (<= 110%)
      expect(res.healthRatioPercent).toBe(108.0);
      expect(res.status).toBe("critical");
      expect(res.bufferAmountXlm).toBe(-6000);
    });
  });

  describe("Action Preview & Reconciliations (Preview reconciles to resulting ratio)", () => {
    it("previews top-up with increased collateral and restored buffer", () => {
      const preview = previewCollateralAction(criticalPosition, "top_up", 20000);
      expect(preview.isValid).toBe(true);
      expect(preview.canExecute).toBe(true);
      expect(preview.resultingCollateral).toBe(72000);
      expect(preview.resultingRatioPercent).toBe(144.0); // 72k / 50k
      expect(preview.resultingStatus).toBe("healthy");
      expect(preview.resultingBuffer).toBe(12000); // 72k - 60k
    });

    it("previews safe withdrawal within excess buffer", () => {
      // Current: 75k (150%). Withdrawing 10k -> 65k (130% >= 120% min)
      const preview = previewCollateralAction(healthyPosition, "withdrawal", 10000);
      expect(preview.isValid).toBe(true);
      expect(preview.canExecute).toBe(true);
      expect(preview.resultingCollateral).toBe(65000);
      expect(preview.resultingRatioPercent).toBe(130.0);
      expect(preview.resultingBuffer).toBe(5000);
    });
  });

  describe("Withdrawal Blocking (Block withdrawals that breach minimum)", () => {
    it("blocks withdrawals that breach the 120% minimum collateral requirement", () => {
      // Current: 75k (150%). Withdrawing 20k -> 55k (110% < 120% min)
      const preview = previewCollateralAction(healthyPosition, "withdrawal", 20000);
      expect(preview.isValid).toBe(true);
      expect(preview.canExecute).toBe(false);
      expect(preview.blockReason).toContain("falls below 120.00% minimum collateral requirement");
    });

    it("blocks withdrawals while position is in critical state", () => {
      const preview = previewCollateralAction(criticalPosition, "withdrawal", 1000);
      expect(preview.canExecute).toBe(false);
      expect(preview.blockReason).toContain("strictly blocked while position is in critical liquidation territory");
    });

    it("blocks withdrawal exceeding deposited collateral", () => {
      const preview = previewCollateralAction(healthyPosition, "withdrawal", 90000);
      expect(preview.canExecute).toBe(false);
      expect(preview.blockReason).toContain("exceeds total deposited collateral");
    });
  });

  describe("History and State Updates (Top-ups update history)", () => {
    it("executes top-up and logs audit history entry", () => {
      const { updatedPosition, historyEntry } = executeCollateralTopUp(
        warningPosition,
        15000,
        "GBBORROWER123",
        "tx_topup_1",
        "2026-11-20T12:00:00Z",
      );

      expect(updatedPosition.current_collateral_xlm).toBe(80000);
      expect(updatedPosition.current_health_ratio_percent).toBe(160.0);
      expect(updatedPosition.health_status).toBe("healthy");

      expect(historyEntry.type).toBe("top_up");
      expect(historyEntry.amount_xlm).toBe(15000);
      expect(historyEntry.previous_ratio_percent).toBe(130.0);
      expect(historyEntry.resulting_ratio_percent).toBe(160.0);
      expect(historyEntry.tx_hash).toBe("tx_topup_1");
    });

    it("executes valid withdrawal and updates position and history", () => {
      const { updatedPosition, historyEntry } = executeCollateralWithdrawal(
        healthyPosition,
        10000,
        "GBBORROWER123",
        "tx_with_1",
        "2026-11-20T12:00:00Z",
      );

      expect(updatedPosition.current_collateral_xlm).toBe(65000);
      expect(updatedPosition.current_health_ratio_percent).toBe(130.0);
      expect(historyEntry.type).toBe("withdrawal");
      expect(historyEntry.amount_xlm).toBe(10000);
    });

    it("throws error when attempting to execute an invalid withdrawal", () => {
      expect(() =>
        executeCollateralWithdrawal(healthyPosition, 30000, "GBBORROWER123"),
      ).toThrow(/Withdrawal blocked/);
    });
  });
});
