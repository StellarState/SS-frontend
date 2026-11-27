import { describe, it, expect } from "vitest";
import {
  evaluateA11yResults,
  DYNAMIC_MASK_SELECTORS,
  type AxeViolation,
} from "../a11y-scanner";

describe("evaluateA11yResults (Issue #762)", () => {
  it("passes when there are zero violations", () => {
    const result = evaluateA11yResults([]);
    expect(result.hasBlockingViolations).toBe(false);
    expect(result.blockingViolations.length).toBe(0);
    expect(result.warningViolations.length).toBe(0);
    expect(result.report).toContain("0 total violation(s)");
  });

  it("blocks when there are critical or serious violations", () => {
    const violations: AxeViolation[] = [
      {
        id: "button-name",
        impact: "critical",
        description: "Buttons must have discernible text",
        help: "Buttons must have discernible text",
        helpUrl: "https://dequeuniversity.com/rules/axe/4.4/button-name",
        nodes: [{ html: "<button></button>", target: ["button"] }],
      },
      {
        id: "aria-required-attr",
        impact: "serious",
        description: "Required ARIA attributes must be provided",
        help: "Required ARIA attributes must be provided",
        helpUrl: "https://dequeuniversity.com/rules/axe/4.4/aria-required-attr",
        nodes: [{ html: '<div role="checkbox"></div>', target: ["div"] }],
      },
    ];

    const result = evaluateA11yResults(violations);
    expect(result.hasBlockingViolations).toBe(true);
    expect(result.blockingViolations.length).toBe(2);
    expect(result.warningViolations.length).toBe(0);
    expect(result.report).toContain("BLOCKING (2 serious/critical)");
    expect(result.report).toContain("button-name");
    expect(result.report).toContain("aria-required-attr");
  });

  it("treats moderate and minor violations as non-blocking warnings", () => {
    const violations: AxeViolation[] = [
      {
        id: "region",
        impact: "moderate",
        description: "All page content should be contained by landmarks",
        help: "All page content should be contained by landmarks",
        helpUrl: "https://dequeuniversity.com/rules/axe/4.4/region",
        nodes: [{ html: "<div>some text</div>", target: ["div"] }],
      },
      {
        id: "meta-viewport",
        impact: "minor",
        description: "Zooming should not be disabled",
        help: "Zooming should not be disabled",
        helpUrl: "https://dequeuniversity.com/rules/axe/4.4/meta-viewport",
        nodes: [{ html: "<meta name='viewport'>", target: ["meta"] }],
      },
    ];

    const result = evaluateA11yResults(violations);
    expect(result.hasBlockingViolations).toBe(false);
    expect(result.blockingViolations.length).toBe(0);
    expect(result.warningViolations.length).toBe(2);
    expect(result.report).toContain("WARNINGS (2 moderate/minor)");
  });

  it("defines dynamic mask selectors for timestamps and amounts", () => {
    expect(DYNAMIC_MASK_SELECTORS).toContain('[data-testid*="timestamp"]');
    expect(DYNAMIC_MASK_SELECTORS).toContain('[data-testid*="balance"]');
    expect(DYNAMIC_MASK_SELECTORS).toContain('[data-testid*="amount"]');
    expect(DYNAMIC_MASK_SELECTORS).toContain("time");
  });
});
