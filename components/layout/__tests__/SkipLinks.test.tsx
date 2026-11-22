import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SkipLinks, MAIN_CONTENT_ID, PRIMARY_NAV_ID } from "@/components/layout/SkipLinks";
import { expectNoCriticalAxeViolations } from "@/test/axe";

describe("SkipLinks (#652)", () => {
  it("is the first focusable element and links to the main landmark and navigation", () => {
    const { container } = render(
      <>
        <SkipLinks />
        <nav id={PRIMARY_NAV_ID} aria-label="Main navigation"><a href="/x">Nav</a></nav>
        <main id={MAIN_CONTENT_ID} tabIndex={-1}><h1>Page</h1></main>
      </>,
    );

    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveTextContent("Skip to main content");
    expect(links[0]).toHaveAttribute("href", `#${MAIN_CONTENT_ID}`);
    expect(links[1]).toHaveAttribute("href", `#${PRIMARY_NAV_ID}`);

    fireEvent.click(links[0]);
    expect(document.getElementById(MAIN_CONTENT_ID)).toHaveFocus();
    expect(document.getElementById(MAIN_CONTENT_ID)).toHaveAttribute("tabindex", "-1");
  });

  it("has no critical axe violations", async () => {
    const { container } = render(
      <>
        <SkipLinks />
        <main id={MAIN_CONTENT_ID}><h1>Page</h1></main>
      </>,
    );
    await expectNoCriticalAxeViolations(container);
  });
});
