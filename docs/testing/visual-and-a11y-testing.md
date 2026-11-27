# Automated Accessibility & Visual Regression Testing

This guide documents the automated accessibility (`axe-core`) and visual regression (`Playwright`) testing suite for StellarState frontend (Issue #762).

## Overview

The test suite runs on every pull request targeting `dev` or `main` to prevent accessibility regressions and unintended UI visual shifts.

### Scanned Target Pages
1. **Marketplace**: `/marketplace`
2. **Invoice Detail**: `/invoices/1`
3. **Portfolio**: `/portfolio` (and `/investor/portfolio`)
4. **Settings**: `/settings`

### Coverage Dimensions
- **Themes**: Light mode and Dark mode
- **Viewports**:
  - **Desktop**: 1280 × 720 px
  - **Mobile**: 375 × 667 px

---

## Accessibility (A11y) Verification

Accessibility is audited using `@axe-core/playwright` with rules matching WCAG 2.0 / 2.1 Level A and AA standards.

### Failure Policy
- **Critical & Serious violations**: **BLOCKING**. The CI job fails immediately.
- **Moderate & Minor violations**: **WARNINGS**. Reported in test output and logs without blocking builds.

Color contrast checks are verified through design system tokens rather than headless layout passes to prevent false positives with custom CSS variables.

---

## Visual Regression & Snapshot Testing

Visual diffing takes full screenshots of target pages in all 4 configurations (Desktop Light/Dark, Mobile Light/Dark).

### Dynamic Content Masking
To prevent flaky diffs caused by unpredictable live data, dynamic regions are masked out before comparison:
- Timestamps and relative times (`time`, `[data-testid*="time"]`, `[data-testid*="date"]`)
- Live balances and numerical amounts (`.tabular-nums`, `[data-testid*="balance"]`, `[data-testid*="amount"]`)
- Dynamic wallet addresses and transaction hashes (`[data-testid*="address"]`, `[data-testid*="hash"]`)
- Random confirmation and correlation IDs (`[data-testid*="confirmation"]`)

---

## Local Development & Updating Baselines

### Running Tests Locally
Ensure the Next.js development or production server is built:
```bash
npm run build
npx playwright test tests/e2e/a11y-visual.spec.ts
```

To run with UI or interactive debugging:
```bash
npx playwright test --ui
```

### Intentionally Updating Baselines
When you intentionally alter layout, design tokens, or typography, update snapshot baselines using:
```bash
npx playwright test tests/e2e/a11y-visual.spec.ts --update-snapshots
```

Commit the generated snapshot files along with your PR.

---

## CI Artifacts & Debugging
If a visual snapshot test fails in GitHub Actions:
1. Navigate to the failed workflow run in the **Actions** tab.
2. Download the `playwright-diffs` artifact.
3. Inspect the expected, actual, and diff images side by side.
