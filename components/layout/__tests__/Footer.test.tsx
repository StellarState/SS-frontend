import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Footer } from "@/components/layout/Footer";
import { expectNoCriticalAxeViolations } from "@/test/axe";

describe("Footer (#655)", () => {
  it("exposes About, Trust, Terms, Privacy and Status links on every page", () => {
    render(<Footer />);

    const expected: Array<[string, string]> = [
      ["footer-about-link", "/about"],
      ["footer-trust-link", "/trust"],
      ["footer-terms-link", "/terms"],
      ["footer-privacy-link", "/privacy"],
      ["footer-status-link", "/status"],
      ["footer-fees-link", "/fees"],
    ];
    for (const [testId, href] of expected) {
      const link = screen.getByTestId(testId);
      expect(link).toHaveAttribute("href", href);
    }
  });

  it("uses a labelled footer landmark with no critical axe violations", async () => {
    const { container } = render(<Footer />);
    expect(screen.getByRole("contentinfo", { name: "Site footer" })).toBeInTheDocument();
    await expectNoCriticalAxeViolations(container);
  });
});
