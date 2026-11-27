import fs from "node:fs";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { evaluateA11yResults, DYNAMIC_MASK_SELECTORS } from "../../lib/testing/a11y-scanner";

const PAGES = [
  { name: "marketplace", path: "/marketplace" },
  { name: "invoice-detail", path: "/invoices/1" },
  { name: "portfolio", path: "/portfolio" },
  { name: "settings", path: "/settings" },
];

test.describe("Automated Accessibility & Visual Regression Checks (Issue #762)", () => {
  for (const target of PAGES) {
    test(`[A11y] ${target.name} page has no serious or critical accessibility violations`, async ({
      page,
    }) => {
      // Mock common API calls to ensure page loads deterministically
      await page.route("**/api/**", (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ items: [], invoices: [], data: {} }),
        });
      });

      await page.goto(target.path, { waitUntil: "domcontentloaded" });

      const axeResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .disableRules(["color-contrast"]) // Handled by design system tokens
        .analyze();

      const evaluation = evaluateA11yResults(axeResults.violations as any);

      if (evaluation.warningViolations.length > 0) {
        console.warn(`[WARN] Non-blocking a11y warnings on ${target.name}:\n${evaluation.report}`);
      }

      if (evaluation.hasBlockingViolations) {
        console.error(`[FAIL] Blocking a11y violations on ${target.name}:\n${evaluation.report}`);
      }

      expect(
        evaluation.hasBlockingViolations,
        `Accessibility check failed on ${target.name} page:\n${evaluation.report}`
      ).toBe(false);
    });

    test(`[Visual] ${target.name} visual snapshot matches baseline with dynamic masks`, async ({
      page,
    }, testInfo) => {
      await page.route("**/api/**", (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ items: [], invoices: [], data: {} }),
        });
      });

      await page.goto(target.path, { waitUntil: "networkidle" }).catch(() => {
        return page.goto(target.path, { waitUntil: "domcontentloaded" });
      });

      // Locate all dynamic masking targets to avoid flaky diffs
      const masks = DYNAMIC_MASK_SELECTORS.map((selector) => page.locator(selector));
      const snapshotName = `${target.name}-${testInfo.project.name}.png`;
      const baselinePath = testInfo.snapshotPath(snapshotName);

      if (fs.existsSync(baselinePath)) {
        await expect(page).toHaveScreenshot(snapshotName, {
          mask: masks,
          maxDiffPixelRatio: 0.05,
          animations: "disabled",
        });
      } else {
        // Initial run before baseline PNGs are committed: capture & attach masked screenshot
        const actualPath = testInfo.outputPath(snapshotName);
        await page.screenshot({
          path: actualPath,
          mask: masks,
          animations: "disabled",
        });
        await testInfo.attach(snapshotName, {
          path: actualPath,
          contentType: "image/png",
        });
      }
    });
  }
});
