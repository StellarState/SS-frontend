# Frontend V1 finance surface contract

Issues #594, #595, #596 and #597 add four investor and admin surfaces to
`SS-frontend`. This repository is frontend-only, so the API routes below are a
contract the backend must provide. The UI never invents data: if a route is
missing or rejects, the affected panel renders an explicit unavailable state.

## #597 Portfolio concentration

`usePortfolioConcentration(tab, threshold)` derives groups from
`usePortfolio()`. No extra endpoint is required, but open positions may carry
the optional fields below. Missing values are grouped as `Unspecified`.

```ts
interface ConcentrationPosition {
  invoice_id: string;
  committed_amount: number;
  status: "active" | "settled" | "expired" | "defaulted";
  debtor?: string | null;
  jurisdiction?: string | null;
  maturity_bucket?: string | null;
  lockup_expires_at?: string | null;
}
```

- Tabs: `debtor`, `jurisdiction`, `maturity`.
- `maturity` uses `maturity_bucket` when present, otherwise it is derived from
  `lockup_expires_at` into `Matured`, `0 to 30 days`, `31 to 90 days`,
  `91 to 365 days` or `Over 1 year`.
- Shares are outstanding principal divided by total open principal, rounded to
  two decimals. Rounding drift goes to the largest group so each tab sums to
  exactly 100%.
- A group is flagged when its share is strictly greater than the threshold,
  which defaults to 25%.
- No open positions renders the empty state and no treemap.

## #596 Vault reconciliation

`GET /admin/vaults/reconciliation` returns:

```ts
interface VaultReconciliationData {
  contract_balance: number;
  checked_at: string;
  vaults: Array<{
    invoice_id: string;
    invoice_title?: string;
    balance: number;
    lifetime_in: number;
    lifetime_out: number;
    status: "open" | "funded" | "closed" | "settled" | "defaulted";
  }>;
}
```

- `difference = contract_balance - sum(vault.balance)`.
- A zero difference (within `1e-9`) shows the pass state. Any other value shows
  fail with the signed difference.
- Vaults on `closed` or `settled` invoices with a positive balance are
  highlighted as stale.
- The table sorts by `balance`, `lifetime_in` or `lifetime_out`, descending by
  default, and the Refresh button refetches the snapshot.

## #595 Issuer netting

`GET /issuer/netting/invoices` returns `NettingInvoice[]`:

```ts
interface NettingInvoice {
  id: string;
  title: string;
  debtor: string;
  direction: "payable" | "receivable";
  amount: number;
  status: "open" | "funded" | "settled" | "disputed";
  investors: Array<{ address: string; amount: number }>;
}
```

`GET /issuer/netting/agreements` returns `NettingAgreement[]`, adding `id`,
`creditor`, `status`, `issuerConsent`, `debtorConsent` and `createdAt`.

- `settled` and `disputed` invoices cannot be selected. The wizard shows why.
- `grossPayable` and `grossReceivable` sum only selectable invoices.
- `netAmount = abs(grossPayable - grossReceivable)`; the larger side pays.
- The allocation table distributes the net across investors of the paying
  side, proportional to each investor's share of each invoice. The last row
  absorbs rounding drift so the total equals the net amount.
- `Settle` is enabled only when status is `pending` and both parties consent.
- `Cancel` is disabled once an agreement is `settled` or `cancelled`.

Write routes:

- `POST /issuer/netting/agreements`
- `POST /issuer/netting/agreements/:id/consent` with `{ party, consent }`
- `POST /issuer/netting/agreements/:id/settle`
- `POST /issuer/netting/agreements/:id/cancel`

## #594 Descending-rate auction

`GET /invoices/:id/rate-auction` returns `null` on 404, otherwise:

```ts
interface RateAuctionData {
  invoice_id: string;
  status: "active" | "closed_filled" | "closed_unfilled";
  start_rate: number;
  max_rate: number;
  step_bps: number;
  step_seconds: number;
  started_at: string;
  funded_percent: number;
}
```

- The ladder runs from `start_rate` to `max_rate` in `step_bps / 100` steps,
  capped at 200 steps.
- The current step is derived from elapsed time since `started_at`. One local
  one-second interval drives the rate and countdown, and it stops on close.
- The commit form shows the rate it will lock and sends `locked_rate` to
  `POST /invoices/:id/rate-auction/commit`.
- Closed filled and closed unfilled outcomes disable the form. Unfilled
  auctions show refund guidance.

## #680 Debtor payment landing page with QR and references

`DebtorPaymentLanding` and `useDebtorPayment` provide a dedicated public portal for invoice debtors:

```ts
interface DebtorPaymentInvoice {
  invoice_id: string;
  invoice_title: string;
  debtor_name: string;
  debtor_address: string;
  currency: "XLM" | "USDC";
  total_due_amount: number;
  amount_paid: number;
  remaining_amount: number;
  payment_reference: string;
  destination_address: string;
  due_date: string;
  status: "due" | "partial" | "settled";
}
```

- Amount, currency, and payment reference memo are directly copyable with visual feedback.
- QR encodes the configured destination and payment reference safely via SEP-0007 URI.
- Confirmation workflow strictly hides internal private investor position data and individual balances.
- Remaining amount is prominently visible across due, partial, and settled states.
- Public route accessible at `/pay/:invoiceId`.

## Failure behavior

Every new hook surfaces `isError`, and each view renders an explicit
unavailable message. There is no mock fallback, so a missing backend route is
visible in review rather than hidden behind invented numbers.
