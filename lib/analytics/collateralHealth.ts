/**
 * Collateral health and top-up workflow analytics (#683).
 *
 * Implements configurable valuation models (mark-to-market and haircut-adjusted),
 * collateral requirement and buffer calculations, warning and liquidation thresholds,
 * live preview reconciliations, withdrawal blocking guards, and audit history.
 */

export type ValuationModel = "mark_to_market" | "haircut_adjusted";
export type CollateralHealthStatus = "healthy" | "warning" | "critical";
export type CollateralActionType = "top_up" | "withdrawal";

export const MIN_COLLATERAL_RATIO_PERCENT = 120.0; // 120% min requirement
export const LIQUIDATION_THRESHOLD_PERCENT = 110.0; // <= 110% critical / liquidation threshold
export const WARNING_THRESHOLD_PERCENT = 135.0; // <= 135% warning threshold
export const DEFAULT_HAIRCUT_PERCENT = 15.0; // 15% haircut for volatile collateral

export interface CollateralPosition {
  id: string;
  invoice_id: string;
  borrower_address: string;
  outstanding_debt_xlm: number;
  current_collateral_xlm: number;
  collateral_asset: string;
  valuation_model: ValuationModel;
  haircut_percent: number;
  effective_collateral_value: number;
  required_collateral_value: number;
  buffer_amount_xlm: number;
  current_health_ratio_percent: number;
  health_status: CollateralHealthStatus;
}

export interface CollateralActionHistory {
  id: string;
  position_id: string;
  type: CollateralActionType;
  amount_xlm: number;
  source_or_destination: string;
  previous_ratio_percent: number;
  resulting_ratio_percent: number;
  timestamp: string;
  tx_hash: string;
}

export interface ActionPreviewResult {
  isValid: boolean;
  canExecute: boolean;
  blockReason?: string;
  deltaAmount: number;
  currentCollateral: number;
  resultingCollateral: number;
  resultingEffectiveValue: number;
  resultingBuffer: number;
  resultingRatioPercent: number;
  resultingStatus: CollateralHealthStatus;
}

/**
 * Calculates collateral health using the configured valuation model.
 * Acceptance criteria: Health uses the configured valuation model; Critical state is prominent.
 */
export function calculateCollateralHealth(
  debtXlm: number,
  collateralXlm: number,
  valuationModel: ValuationModel = "mark_to_market",
  haircutPercent: number = DEFAULT_HAIRCUT_PERCENT,
): {
  effectiveCollateralValue: number;
  requiredCollateralValue: number;
  bufferAmountXlm: number;
  healthRatioPercent: number;
  status: CollateralHealthStatus;
} {
  const safeDebt = Math.max(0.0001, debtXlm);
  const safeCollateral = Math.max(0, collateralXlm);

  // Apply valuation model
  let effectiveCollateralValue = safeCollateral;
  if (valuationModel === "haircut_adjusted") {
    const discount = (safeCollateral * Math.max(0, haircutPercent)) / 100;
    effectiveCollateralValue = Math.max(0, safeCollateral - discount);
  }

  const requiredCollateralValue = (safeDebt * MIN_COLLATERAL_RATIO_PERCENT) / 100;
  const bufferAmountXlm = effectiveCollateralValue - requiredCollateralValue;

  const healthRatioPercent = Number(((effectiveCollateralValue / safeDebt) * 100).toFixed(2));

  let status: CollateralHealthStatus = "healthy";
  if (healthRatioPercent <= LIQUIDATION_THRESHOLD_PERCENT) {
    status = "critical";
  } else if (healthRatioPercent <= WARNING_THRESHOLD_PERCENT) {
    status = "warning";
  }

  return {
    effectiveCollateralValue: Number(effectiveCollateralValue.toFixed(4)),
    requiredCollateralValue: Number(requiredCollateralValue.toFixed(4)),
    bufferAmountXlm: Number(bufferAmountXlm.toFixed(4)),
    healthRatioPercent,
    status,
  };
}

/**
 * Previews resulting collateral ratio before executing a top-up or withdrawal.
 * Acceptance criteria: Preview reconciles to resulting ratio; Block withdrawals that breach minimum.
 */
export function previewCollateralAction(
  position: CollateralPosition,
  action: CollateralActionType,
  amountXlm: number,
): ActionPreviewResult {
  if (!Number.isFinite(amountXlm) || amountXlm <= 0) {
    return {
      isValid: false,
      canExecute: false,
      blockReason: "Amount must be greater than zero.",
      deltaAmount: 0,
      currentCollateral: position.current_collateral_xlm,
      resultingCollateral: position.current_collateral_xlm,
      resultingEffectiveValue: position.effective_collateral_value,
      resultingBuffer: position.buffer_amount_xlm,
      resultingRatioPercent: position.current_health_ratio_percent,
      resultingStatus: position.health_status,
    };
  }

  let resultingCollateral = position.current_collateral_xlm;
  if (action === "top_up") {
    resultingCollateral += amountXlm;
  } else {
    resultingCollateral -= amountXlm;
  }

  if (resultingCollateral < 0) {
    return {
      isValid: false,
      canExecute: false,
      blockReason: "Withdrawal amount exceeds total deposited collateral.",
      deltaAmount: amountXlm,
      currentCollateral: position.current_collateral_xlm,
      resultingCollateral: 0,
      resultingEffectiveValue: 0,
      resultingBuffer: -position.required_collateral_value,
      resultingRatioPercent: 0,
      resultingStatus: "critical",
    };
  }

  const calculated = calculateCollateralHealth(
    position.outstanding_debt_xlm,
    resultingCollateral,
    position.valuation_model,
    position.haircut_percent,
  );

  let canExecute = true;
  let blockReason: string | undefined;

  // Withdrawal rules:
  // 1. Position cannot already be in critical state
  // 2. Withdrawal cannot cause health ratio to fall below 120% min requirement
  if (action === "withdrawal") {
    if (position.health_status === "critical") {
      canExecute = false;
      blockReason = "Withdrawals are strictly blocked while position is in critical liquidation territory.";
    } else if (calculated.healthRatioPercent < MIN_COLLATERAL_RATIO_PERCENT) {
      canExecute = false;
      blockReason = `Withdrawal blocked: Resulting ratio (${calculated.healthRatioPercent}%) falls below 120.00% minimum collateral requirement.`;
    }
  }

  return {
    isValid: true,
    canExecute,
    blockReason,
    deltaAmount: amountXlm,
    currentCollateral: position.current_collateral_xlm,
    resultingCollateral,
    resultingEffectiveValue: calculated.effectiveCollateralValue,
    resultingBuffer: calculated.bufferAmountXlm,
    resultingRatioPercent: calculated.healthRatioPercent,
    resultingStatus: calculated.status,
  };
}

/**
 * Executes a top-up on the collateral position and records audit history.
 * Acceptance criteria: Top-ups update history.
 */
export function executeCollateralTopUp(
  position: CollateralPosition,
  amountXlm: number,
  sourceAddress: string,
  txHash: string = `tx_${Date.now()}`,
  nowInput?: string | Date | number,
): { updatedPosition: CollateralPosition; historyEntry: CollateralActionHistory } {
  const preview = previewCollateralAction(position, "top_up", amountXlm);
  if (!preview.canExecute) {
    throw new Error(preview.blockReason ?? "Top-up cannot be processed.");
  }

  const nowIso =
    nowInput instanceof Date
      ? nowInput.toISOString()
      : typeof nowInput === "string"
        ? new Date(nowInput).toISOString()
        : typeof nowInput === "number"
          ? new Date(nowInput).toISOString()
          : new Date().toISOString();

  const updatedPosition: CollateralPosition = {
    ...position,
    current_collateral_xlm: preview.resultingCollateral,
    effective_collateral_value: preview.resultingEffectiveValue,
    buffer_amount_xlm: preview.resultingBuffer,
    current_health_ratio_percent: preview.resultingRatioPercent,
    health_status: preview.resultingStatus,
  };

  const historyEntry: CollateralActionHistory = {
    id: `act-${Date.now()}`,
    position_id: position.id,
    type: "top_up",
    amount_xlm: amountXlm,
    source_or_destination: sourceAddress,
    previous_ratio_percent: position.current_health_ratio_percent,
    resulting_ratio_percent: preview.resultingRatioPercent,
    timestamp: nowIso,
    tx_hash: txHash,
  };

  return { updatedPosition, historyEntry };
}

/**
 * Executes a withdrawal from the collateral position, ensuring minimum ratio is preserved.
 * Acceptance criteria: Withdrawal uses live collateral; Block withdrawals that breach minimum.
 */
export function executeCollateralWithdrawal(
  position: CollateralPosition,
  amountXlm: number,
  destinationAddress: string,
  txHash: string = `tx_${Date.now()}`,
  nowInput?: string | Date | number,
): { updatedPosition: CollateralPosition; historyEntry: CollateralActionHistory } {
  const preview = previewCollateralAction(position, "withdrawal", amountXlm);
  if (!preview.canExecute) {
    throw new Error(preview.blockReason ?? "Withdrawal breaches collateral minimums.");
  }

  const nowIso =
    nowInput instanceof Date
      ? nowInput.toISOString()
      : typeof nowInput === "string"
        ? new Date(nowInput).toISOString()
        : typeof nowInput === "number"
          ? new Date(nowInput).toISOString()
          : new Date().toISOString();

  const updatedPosition: CollateralPosition = {
    ...position,
    current_collateral_xlm: preview.resultingCollateral,
    effective_collateral_value: preview.resultingEffectiveValue,
    buffer_amount_xlm: preview.resultingBuffer,
    current_health_ratio_percent: preview.resultingRatioPercent,
    health_status: preview.resultingStatus,
  };

  const historyEntry: CollateralActionHistory = {
    id: `act-${Date.now()}`,
    position_id: position.id,
    type: "withdrawal",
    amount_xlm: amountXlm,
    source_or_destination: destinationAddress,
    previous_ratio_percent: position.current_health_ratio_percent,
    resulting_ratio_percent: preview.resultingRatioPercent,
    timestamp: nowIso,
    tx_hash: txHash,
  };

  return { updatedPosition, historyEntry };
}
