# Closes #678: Build issuer covenant monitoring dashboard

### Summary of Changes
- **Core Domain Logic (`lib/analytics/covenantMonitoring.ts`)**:
  - Implemented covenant evaluations: current values, baseline/threshold checks, headroom calculation, and warning/breach state determination.
  - Added accurate cure period countdown formatter (`formatCureCountdown`) tracking days, hours, and minutes remaining.
  - Implemented access control filters (`canViewGroupCovenants`) ensuring authorized investor groups can access sensitive breach/cure details.
- **Hook Layer (`hooks/useCovenantMonitoring.ts`)**:
  - Provides stateful covenant monitoring, filtering by status (compliant, warning, breached, under cure), and secure evidence viewer modal lifecycle management.
- **UI Components (`components/issuers/CovenantMonitoringDashboard.tsx`, `app/issuer/covenants/page.tsx`)**:
  - Built responsive issuer covenant monitoring dashboard displaying covenant health cards with unit badges, threshold progress bars, cure countdowns, and secure evidence inspection modal.
  - Exposed component via `components/issuers/index.ts` and created `/issuer/covenants` page route.
- **Documentation & Tests**:
  - Documented surfaces in `docs/FRONTEND_V1_SURFACES.md`.
  - Added comprehensive unit tests in `lib/analytics/__tests__/covenantMonitoring.test.ts`, surface doc tests in `lib/analytics/__tests__/v1SurfacesDocs.test.ts`, and component tests in `components/issuers/__tests__/CovenantMonitoringDashboard.test.tsx` (all 20 vitest tests passing).
  - Clean `tsc --noEmit` and `next lint`.

### Payout Details
- **Base / EVM (USDC)**: `0x53Eb00b639e3e7fD2E55faB322495d4371faB65a`
- **TRAC**: `trac1sfu7tt3nnlayu27u7hw7chhu4ctzesle3rp8lnqeu3e2ccux3pus8hckea`
- **BCH**: `bitcoincash:qr9gjzwkvghvvdyvqg8pppcvsg084pgeyvjyx3hjjc`
