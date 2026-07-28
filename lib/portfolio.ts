export interface InvestmentPosition {
    invoice_id: string;
    invoice_title: string;
    committed_amount: number;
    status: "active" | "settled" | "expired";
}

export interface PortfolioSummary {
    activeTotal: number;
    formattedTotal: string;
}

/**
 * Calculates the total committed amount across all active invoice positions.
 * Settled and expired invoices are excluded from the active total.
 */
export function calculateActiveTotal(positions: InvestmentPosition[]): PortfolioSummary {
    const activeTotal = positions
        .filter((p) => p.status === "active")
        .reduce((sum, p) => sum + p.committed_amount, 0);

    return {
        activeTotal,
        formattedTotal: `${activeTotal.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })} XLM`,
    };
}