export const INVALID_AMOUNT_ERROR = "Please enter a valid amount";
export const BELOW_MINIMUM_ERROR = "Amount below minimum investment";
export const ABOVE_CAPACITY_ERROR = "Amount exceeds available capacity";

/**
 * Validates a raw investment amount input against the invoice's minimum
 * investment floor and remaining capacity. Returns an inline error message,
 * or null when the amount is valid.
 */
export function validateInvestmentAmount(
    rawValue: string,
    min: number,
    max: number
): string | null {
    const trimmed = rawValue.trim();

    if (trimmed === "" || Number.isNaN(Number(trimmed))) {
        return INVALID_AMOUNT_ERROR;
    }

    const amount = Number(trimmed);

    if (amount < min) {
        return BELOW_MINIMUM_ERROR;
    }

    if (amount > max) {
        return ABOVE_CAPACITY_ERROR;
    }

    return null;
}
