export interface AxeNode {
  html: string;
  target: string[];
  failureSummary?: string;
}

export interface AxeViolation {
  id: string;
  impact?: "minor" | "moderate" | "serious" | "critical" | null;
  description: string;
  help: string;
  helpUrl: string;
  nodes: AxeNode[];
}

export interface A11yScanResult {
  blockingViolations: AxeViolation[];
  warningViolations: AxeViolation[];
  hasBlockingViolations: boolean;
  totalViolations: number;
  report: string;
}

/**
 * CSS selectors for elements containing dynamic, time-sensitive, or randomized
 * content that should be masked during visual regression snapshot comparisons.
 */
export const DYNAMIC_MASK_SELECTORS: string[] = [
  '[data-testid*="timestamp"]',
  '[data-testid*="date"]',
  '[data-testid*="time"]',
  '[data-testid*="balance"]',
  '[data-testid*="amount"]',
  '[data-testid*="yield"]',
  '[data-testid*="hash"]',
  '[data-testid*="address"]',
  '[data-testid*="confirmation"]',
  '[data-testid*="countdown"]',
  "time",
  ".tabular-nums",
];

/**
 * Analyzes axe violations according to Issue #762 requirements:
 * - Critical & serious violations are blocking and fail CI.
 * - Moderate & minor violations are logged as non-blocking warnings.
 */
export function evaluateA11yResults(violations: AxeViolation[]): A11yScanResult {
  const blockingViolations: AxeViolation[] = [];
  const warningViolations: AxeViolation[] = [];

  for (const violation of violations) {
    if (violation.impact === "critical" || violation.impact === "serious") {
      blockingViolations.push(violation);
    } else {
      warningViolations.push(violation);
    }
  }

  const lines: string[] = [];
  lines.push(`A11y Scan Summary: ${violations.length} total violation(s) found.`);

  if (blockingViolations.length > 0) {
    lines.push(`\n❌ BLOCKING (${blockingViolations.length} serious/critical):`);
    for (const v of blockingViolations) {
      lines.push(`  - [${v.impact?.toUpperCase()}] ${v.id}: ${v.help}`);
      for (const node of v.nodes.slice(0, 3)) {
        lines.push(`      Target: ${node.target.join(" ")}`);
        lines.push(`      HTML: ${node.html}`);
      }
    }
  }

  if (warningViolations.length > 0) {
    lines.push(`\n⚠️ WARNINGS (${warningViolations.length} moderate/minor):`);
    for (const v of warningViolations) {
      lines.push(`  - [${v.impact?.toUpperCase() || "WARN"}] ${v.id}: ${v.help}`);
    }
  }

  return {
    blockingViolations,
    warningViolations,
    hasBlockingViolations: blockingViolations.length > 0,
    totalViolations: violations.length,
    report: lines.join("\n"),
  };
}
