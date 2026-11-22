# Closes #674: Add passkey login for account actions

### Summary of Changes
- **Core Security Domain (`lib/security/passkeys.ts`)**:
  - Implemented FIDO2 / WebAuthn passkey registration enforcing server-grade non-expired account challenges.
  - Required explicit fresh confirmation keyword typing before deleting any enrolled passkey.
  - Enforced architectural security boundary: passkeys authorize web authentication and sensitive account actions, while on-chain transactions strictly require cryptographic Ed25519 wallet signing.
  - Implemented fallback authentication flows (backup recovery codes and wallet signatures) when WebAuthn is unavailable or cancelled.
  - Sanitized public passkey metadata ensuring zero private keys or credential secrets leak to the client.
- **Hook Layer (`hooks/usePasskeyManager.ts`)**:
  - State management for active challenges, enrollment validation, removal confirmation, and high-risk action verification.
- **UI & Routing (`components/settings/PasskeySettingsPanel.tsx`, `app/(dashboard)/settings/passkeys/page.tsx`)**:
  - Registered passkeys overview with device badges and sanitized metadata.
  - Enrollment modal with real-time challenge display.
  - Deletion dialog with fresh confirmation input.
  - Sensitive action verification sandbox with fallback toggles.
  - Route available at `/settings/passkeys` with navigation link added to general settings.
- **Documentation & Tests**:
  - Documented surfaces in `docs/FRONTEND_V1_SURFACES.md` adhering to ASCII punctuation rules.
  - Comprehensive unit and component tests in `lib/security/__tests__/passkeys.test.ts`, `components/settings/__tests__/PasskeySettingsPanel.test.tsx`, and `lib/analytics/__tests__/v1SurfacesDocs.test.ts`.

### Payout Details
- **Base / EVM (USDC)**: `0x53Eb00b639e3e7fD2E55faB322495d4371faB65a`
- **TRAC**: `trac1sfu7tt3nnlayu27u7hw7chhu4ctzesle3rp8lnqeu3e2ccux3pus8hckea`
- **BCH**: `bitcoincash:qr9gjzwkvghvvdyvqg8pppcvsg084pgeyvjyx3hjjc`
