# Closes #671: Create admin compliance review queue

### Summary of Changes
- **Core Domain & Triage Engine (`lib/admin/complianceQueue.ts`)**:
  - Implemented role-based authorization restrictions gating queue access strictly to compliance officers and administrators.
  - Timezone-independent SLA calculation tracking exact epoch durations and triggering automatic escalations.
  - Enforced mandatory substantive decision comments (>= 5 chars) preventing accidental approvals or account restrictions.
  - Immutable, append-only case history records tracking operators, decisions, and comments.
  - Multi-attribute filtering across risk tiers, categories (KYC, AML, RESTRICTIONS), assignees, and case statuses.
- **Hook Layer (`hooks/useComplianceQueue.ts`)**:
  - State management for active cases, multi-criteria filtering, drawer selection, and real-time live count updates immediately upon case resolution.
- **UI Components & Route (`components/admin/ComplianceReviewQueue.tsx`, `app/admin/compliance/page.tsx`)**:
  - Triage table with live metric strip, timezone-independent SLA badges, risk badges, and interactive case drawer.
  - Case drawer featuring verified evidence files, immutable timeline, and decision actions.
  - Route available at `/admin/compliance`.
- **Documentation & Tests**:
  - Documented surfaces in `docs/FRONTEND_V1_SURFACES.md` adhering to ASCII punctuation rules.
  - Comprehensive unit and component tests in `lib/admin/__tests__/complianceQueue.test.ts`, `components/admin/__tests__/ComplianceReviewQueue.test.tsx`, and `lib/analytics/__tests__/v1SurfacesDocs.test.ts`.

### Payout Details
- **Base / EVM (USDC)**: `0x53Eb00b639e3e7fD2E55faB322495d4371faB65a`
- **TRAC**: `trac1sfu7tt3nnlayu27u7hw7chhu4ctzesle3rp8lnqeu3e2ccux3pus8hckea`
- **BCH**: `bitcoincash:qr9gjzwkvghvvdyvqg8pppcvsg084pgeyvjyx3hjjc`
