# Closes #676: Add downloadable reconciliation transaction journal

### Summary of Changes
- **Core Domain & Exporters (`lib/analytics/transactionJournal.ts`)**:
  - Implemented CSV export adhering to RFC 4180 with robust protection against CSV / Excel formula injection (auto-escaping `=`, `+`, `-`, `@`, `\t`, `\r`).
  - Implemented XLSX export via valid SpreadsheetML XML workbook with exact data types and styling.
  - Enforced explicit ISO currency and fixed decimal precision on all monetary amounts and network fees.
  - Attached reconciliation batch IDs to all settlement transactions.
  - Multi-criteria filtering engine supporting start/end dates, source/destination accounts, transaction statuses, and batch IDs.
  - Chunked asynchronous export streaming for large datasets (> 50 rows) with progress feedback.
- **Hook Layer (`hooks/useTransactionJournal.ts`)**:
  - State management for filter parameters, filtered journal views, async export lifecycle, and automatic browser download triggering.
- **UI & Routing (`components/admin/TransactionJournalExport.tsx`, `app/admin/journal/page.tsx`)**:
  - Filter controls toolbar with date inputs, account search, status selector, and reset button.
  - Summary KPI cards displaying filtered record count, total volume, and total fees.
  - Transaction table with monetary formatting, status badges, and batch ID indicators.
  - New admin route at `/admin/journal`.
- **Documentation & Verification**:
  - Documented surfaces in `docs/FRONTEND_V1_SURFACES.md` adhering to ASCII punctuation rules.
  - Comprehensive unit and component tests in `lib/analytics/__tests__/transactionJournal.test.ts`, `components/admin/__tests__/TransactionJournalExport.test.tsx`, and `lib/analytics/__tests__/v1SurfacesDocs.test.ts`.

### Payout Details
- **Base / EVM (USDC)**: `0x53Eb00b639e3e7fD2E55faB322495d4371faB65a`
- **TRAC**: `trac1sfu7tt3nnlayu27u7hw7chhu4ctzesle3rp8lnqeu3e2ccux3pus8hckea`
- **BCH**: `bitcoincash:qr9gjzwkvghvvdyvqg8pppcvsg084pgeyvjyx3hjjc`
