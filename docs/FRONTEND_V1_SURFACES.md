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

## #678 Issuer covenant monitoring dashboard

`CovenantMonitoringDashboard` and `useCovenantMonitoring` provide covenant tracking, headroom buffers, cure countdowns, and evidence verification:

```ts
interface MonitoredCovenant {
  id: string;
  name: string;
  metric_unit: string;
  direction: "min" | "max";
  threshold_value: number;
  warning_threshold_value: number;
  current_value: number;
  status: "healthy" | "warning" | "breached" | "cured";
  headroom_value: number;
  headroom_percent: number;
  cure_deadline?: string | null;
  cure_plan_summary?: string | null;
  evidence_records: CovenantEvidenceRecord[];
}
```

- Each covenant reports explicit units, required thresholds, warning triggers, and current values.
- Headroom calculations trigger warning alerts preceding breach thresholds.
- Active breaches display accurate real-time cure countdown timers.
- Evidence records open in the secure viewer displaying verified IPFS CID and SHA-256 hash.
- Authorised investor groups see active breaches, cure plan remediation, and confidential evidence.
- Route available at `/issuer/covenants`.

## #677 Proof of reserves dashboard

`ProofOfReservesDashboard` and `useProofOfReserves` provide real-time public reserve reconciliation, numerical gap tracking, and snapshot freshness verification:

```ts
interface ReservesSummary {
  snapshot_id: string;
  snapshot_timestamp: string;
  snapshot_age_text: string;
  is_stale: boolean;
  total_assets: number;
  total_obligations: number;
  reserve_gap: number;
  reserve_ratio: number;
  status: ReservesStatus;
  accounts: ReserveAccount[];
  obligations: ObligationCategory[];
}
```

- Total protocol obligations reconcile to backing assets.
- Reserve gap is shown numerically as surplus buffer or deficit.
- Snapshot age indicator warns when data is older than 24 hours.
- Reserve accounts provide verifiable links to block explorers and auditor attestations.
- Missing attestations are safely indicated without breaking dashboard presentation.
- Public route accessible without authentication at `/reserves`.

## #676 Downloadable reconciliation transaction journal

`TransactionJournalExport` and `useTransactionJournal` provide institutional accounting exports with multi-format generation and formula defense:

```ts
interface JournalEntry {
  id: string;
  timestamp: string;
  source_account: string;
  destination_account: string;
  amount: number;
  currency: string;
  precision: number;
  fee: number;
  fee_currency: string;
  fee_precision: number;
  memo: string;
  status: TransactionStatus;
  type: TransactionType;
  reconciliation_batch_id: string | null;
}
```

- CSV and XLSX outputs contain identical filtered transaction records.
- All monetary values include explicit ISO currency and required decimal precision.
- Spreadsheet fields safely escape formula injection characters (=, +, -, @).
- Settlement rows include associated reconciliation batch IDs.
- High-volume exports stream asynchronously with progress feedback.
- Route available at `/admin/journal`.

## #675 Account merge and duplicate wallet resolution

`AccountMergeWizard` and `useAccountMergeWizard` provide safe multi-wallet consolidation with dual signature proofs and conflict blocking:

```ts
interface MergeAuditReceipt {
  mergeId: string;
  timestamp: string;
  primaryWallet: string;
  mergedWallet: string;
  primarySignature: WalletSignatureProof;
  secondarySignature: WalletSignatureProof;
  consolidatedHoldings: WalletAccountHoldings;
  transferredNotificationCount: number;
  revokedSessionIds: string[];
  auditHash: string;
}
```

- Both primary and secondary wallets must prove cryptographic private key ownership.
- The wizard previews all affected data across balances, invoices, and KYC tier.
- Contradictory KYC identities block merge execution automatically.
- Stale web and mobile sessions on the merged account are revoked immediately upon merge.
- Immutable audit receipt with hash and JSON export ensures verifiable compliance.
- Route available at `/security/merge`.

## #674 Passkey login for account actions

`PasskeySettingsPanel` and `usePasskeyManager` provide FIDO2 WebAuthn passkey registration, high-risk change protection, and wallet separation:

```ts
interface PasskeyCredentialMetadata {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  authenticatorType: "platform" | "cross-platform";
  aaguid: string;
  algorithm: "ES256" | "RS256";
  transports: string[];
}
```

- Passkey enrollment enforces a valid, non-expired account challenge.
- Removal of any registered passkey requires explicit fresh confirmation typing.
- On-chain Stellar transactions strictly require cryptographic wallet signing, not passkeys.
- Usable fallback options (recovery codes, wallet signatures) are provided when passkeys are unavailable.
- Displayed passkey metadata is sanitized to never expose private keys or secrets.
- Route available at `/settings/passkeys`.

## #673 Wallet recovery readiness checklist

`WalletRecoverySettings` and `useRecoveryReadiness` provide wallet recovery posture assessment, instant checklist feedback, and recovery address cooldown timelocks:

```ts
interface WalletRecoveryReadinessProfile {
  walletPublicKey: string;
  readinessScore: number;
  statusTier: "critical" | "moderate" | "robust";
  items: RecoveryControlItem[];
  currentRecoveryAddress: string | null;
  activeCooldown: RecoveryAddressCooldown | null;
}
```

- Zero secret exposure: the interface never requests or displays private keys or seed phrases.
- Readiness score reflects confirmed multi-sig signers, backup emails, and hardware keys.
- Recovery address changes enforce a mandatory 48-hour security cooldown timelock.
- Checklist actions update immediately upon configuration changes.
- Route available at `/settings/recovery`.

## Failure behavior

Every new hook surfaces `isError`, and each view renders an explicit
unavailable message. There is no mock fallback, so a missing backend route is
visible in review rather than hidden behind invented numbers.
