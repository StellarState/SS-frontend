# Closes #675: Build account merge and duplicate wallet resolution

### Summary of Changes
- **Core Security & Consolidation Engine (`lib/security/accountMerge.ts`)**:
  - Implemented dual wallet cryptographic proof verification: both primary and merging secondary wallets must sign a deterministic challenge to prove private key ownership.
  - Multi-account data reconciliation calculating combined holdings (USDC, XLM), active invoices, and notification counts.
  - Strict KYC conflict detection: prevents automatic merging if two distinct legally verified identities are present, mandating compliance escalation.
  - Automatic revocation of stale sessions on the merged wallet to prevent session hijacking or orphaned access tokens.
  - Cryptographic audit receipt generation featuring deterministic audit hashes and downloadable JSON logs.
- **Hook Layer (`hooks/useAccountMergeWizard.ts`)**:
  - Step-based wizard state machine coordinating wallet identification, conflict analysis, dual signing, and atomic merge execution.
- **UI & Routing (`components/security/AccountMergeWizard.tsx`, `app/security/merge/page.tsx`)**:
  - Four-step interactive wizard with data comparison table, blocking KYC conflict alerts, dual signing cards, and audit receipt summary.
  - New route available at `/security/merge`.
- **Documentation & Verification**:
  - Documented surfaces in `docs/FRONTEND_V1_SURFACES.md` adhering to ASCII punctuation rules.
  - Comprehensive unit and component tests in `lib/security/__tests__/accountMerge.test.ts`, `components/security/__tests__/AccountMergeWizard.test.tsx`, and `lib/analytics/__tests__/v1SurfacesDocs.test.ts`.

### Payout Details
- **Base / EVM (USDC)**: `0x53Eb00b639e3e7fD2E55faB322495d4371faB65a`
- **TRAC**: `trac1sfu7tt3nnlayu27u7hw7chhu4ctzesle3rp8lnqeu3e2ccux3pus8hckea`
- **BCH**: `bitcoincash:qr9gjzwkvghvvdyvqg8pppcvsg084pgeyvjyx3hjjc`
