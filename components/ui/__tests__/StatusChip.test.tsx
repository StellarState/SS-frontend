import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { StatusChip, type StatusVariant } from "../StatusChip";

const VARIANTS: StatusVariant[] = ["success", "danger", "warning", "info", "neutral"];

describe("StatusChip", () => {
  it.each(VARIANTS)("shows an icon and a text label for %s", (variant) => {
    const { container } = render(<StatusChip variant={variant} />);
    const chip = screen.getByTestId("status-chip");
    expect(chip).toHaveTextContent(/\w/);
    expect(container.querySelector("svg")).not.toBeNull();
    expect(chip).toHaveAttribute("data-variant", variant);
  });

  it("uses a caller-provided label", () => {
    render(<StatusChip variant="danger" label="Payment failed" />);
    expect(screen.getByText("Payment failed")).toBeInTheDocument();
  });

  it("keeps icon and label in every palette", () => {
    for (const palette of ["default", "high-contrast", "color-blind"]) {
      document.documentElement.setAttribute("data-palette", palette);
      const { container, unmount } = render(<StatusChip variant="success" label="Paid" />);
      expect(screen.getByText("Paid")).toBeInTheDocument();
      expect(container.querySelector("svg")).not.toBeNull();
      unmount();
    }
  });
});
