import axe from "axe-core";

/**
 * Runs axe against a rendered subtree and fails on critical or serious
 * violations (issue #652). Colour contrast is checked by the design system's
 * tokens rather than jsdom, which has no real layout engine.
 */
export async function expectNoCriticalAxeViolations(container: HTMLElement): Promise<void> {
  const results = await axe.run(container, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
    rules: { "color-contrast": { enabled: false } },
  });

  const blocking = results.violations.filter(
    (violation) => violation.impact === "critical" || violation.impact === "serious",
  );

  if (blocking.length > 0) {
    const detail = blocking
      .map((violation) => `${violation.id}: ${violation.nodes.map((n) => n.html).join(", ")}`)
      .join("\n");
    throw new Error(`Accessibility violations found:\n${detail}`);
  }
}
