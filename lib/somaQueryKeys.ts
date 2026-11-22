/** Query keys for the Soma-owned Wave features. */

export const somaQueryKeys = {
  attestations: (invoiceId: string) => ["attestations", invoiceId] as const,
  debtorStatus: (debtorHash: string) => ["debtor-status", debtorHash] as const,
  paymentInstructions: (token: string) => ["payment-instructions", token] as const,
  invoiceTemplates: ["invoice-templates"] as const,
} as const;
