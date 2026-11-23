/**
 * Namespaced React Query keys shared by the Wave feature hooks.
 *
 * Keeping the keys in one place lets mutations invalidate exactly the views
 * they change, instead of sprinkling string literals through components.
 */

export const queryKeys = {
  campaigns: ["campaigns"] as const,
  withholding: ["withholding"] as const,
  debtorHeadroom: (debtorId: string) => ["debtor-headroom", debtorId] as const,
  settlementAllocation: (invoiceId: string) =>
    ["settlement-allocation", invoiceId] as const,
  investorPayouts: ["investor-payouts"] as const,
  attestations: (invoiceId: string) => ["attestations", invoiceId] as const,
  debtorStatus: (debtorHash: string) => ["debtor-status", debtorHash] as const,
  paymentInstructions: (token: string) =>
    ["payment-instructions", token] as const,
  invoiceTemplates: ["invoice-templates"] as const,
} as const;
