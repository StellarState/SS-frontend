# Closes #677: Show protocol proof-of-reserve dashboard

### Summary of Changes
- **Core Domain & Calculations (`lib/analytics/proofOfReserves.ts`)**:
  - Reconciles total assets and protocol obligations, calculating numerical reserve gaps and backing ratios.
  - Snapshot age indicator detecting staleness (> 24 hours threshold).
  - Verifiable block explorer links for Stellar and Ethereum custody accounts.
  - Safe fallback handling for accounts with missing or pending independent third-party attestations.
- **Hook Layer (`hooks/useProofOfReserves.ts`)**:
  - Provides stateful reserve snapshot lifecycle, network filtering, real-time refresh, and scenario simulation without requiring wallet connection or authentication (`page works while logged out`).
- **UI Components & Route (`components/reserves/ProofOfReservesDashboard.tsx`, `app/reserves/page.tsx`)**:
  - Public `/reserves` dashboard featuring 4 key metric cards (Backed Assets, Total Obligations, Numerical Reserve Gap, Backing Ratio Progress), status badges, snapshot age counter, verifiable custody account cards, and obligations breakdown.
- **Documentation & Tests**:
  - Documented surfaces in `docs/FRONTEND_V1_SURFACES.md` adhering to ASCII punctuation rules.
  - Comprehensive unit tests in `lib/analytics/__tests__/proofOfReserves.test.ts`, surface documentation tests in `lib/analytics/__tests__/v1SurfacesDocs.test.ts`, and component tests in `components/reserves/__tests__/ProofOfReservesDashboard.test.tsx`.

### Payout Details
- **Base / EVM (USDC)**: `0x53Eb00b639e3e7fD2E55faB322495d4371faB65a`
- **TRAC**: `trac1sfu7tt3nnlayu27u7hw7chhu4ctzesle3rp8lnqeu3e2ccux3pus8hckea`
- **BCH**: `bitcoincash:qr9gjzwkvghvvdyvqg8pppcvsg084pgeyvjyx3hjjc`
