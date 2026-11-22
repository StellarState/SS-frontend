# Closes #672: Add KYC document expiry and re-verification workflow

### Summary of Changes
- **Core Domain & Expiry Tracking (`lib/analytics/kycExpiry.ts`)**:
  - Implemented proactive accreditation lifecycle tracking across 30-day, 14-day, and 7-day reminder milestones.
  - Timezone-aware expiration countdown formatting for accurate localized deadlines.
  - Enforced operational restrictions on high-risk protocol actions during the final 7-day grace window with explicit expiry reasoning.
  - Focused re-verification upload workflow with historical field preservation (entity name, tax ID, jurisdiction, signers remain locked and verified).
  - Immediate silencing of alert reminders and notifications upon renewal submission.
- **Hook Layer (`hooks/useKycExpiry.ts`)**:
  - State management for expiry countdowns, dynamic action permission evaluation, and fast-track renewal submission.
- **UI Components & Route (`components/kyc/KycExpiryBanner.tsx`, `app/kyc/reverify/page.tsx`)**:
  - User-specific banner with countdown badge, notification indicator, restricted actions preview, and focused re-verification modal.
  - Route available at `/kyc/reverify`.
- **Documentation & Tests**:
  - Documented surfaces in `docs/FRONTEND_V1_SURFACES.md` adhering to ASCII punctuation rules.
  - Comprehensive unit and component tests in `lib/analytics/__tests__/kycExpiry.test.ts`, `components/kyc/__tests__/KycExpiryBanner.test.tsx`, and `lib/analytics/__tests__/v1SurfacesDocs.test.ts`.

### Payout Details
- **Base / EVM (USDC)**: `0x53Eb00b639e3e7fD2E55faB322495d4371faB65a`
- **TRAC**: `trac1sfu7tt3nnlayu27u7hw7chhu4ctzesle3rp8lnqeu3e2ccux3pus8hckea`
- **BCH**: `bitcoincash:qr9gjzwkvghvvdyvqg8pppcvsg084pgeyvjyx3hjjc`
