import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";

import { DisplayPreferences } from "../DisplayPreferences";
import { PaletteSelector } from "../PaletteSelector";
import { PreferencesProvider } from "@/context/PreferencesContext";

function renderWithProvider(ui: ReactNode) {
  return render(<PreferencesProvider>{ui}</PreferencesProvider>);
}

describe("DisplayPreferences", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-density");
    document.documentElement.removeAttribute("data-palette");
    document.documentElement.style.fontSize = "";
  });

  it("updates the live preview and root attributes on density change", async () => {
    const user = userEvent.setup();
    renderWithProvider(<DisplayPreferences />);

    await user.click(screen.getByRole("button", { name: "Compact" }));

    expect(screen.getByTestId("display-preview")).toHaveAttribute("data-density", "compact");
    expect(document.documentElement).toHaveAttribute("data-density", "compact");
  });

  it("scales text via the root font size", async () => {
    const user = userEvent.setup();
    renderWithProvider(<DisplayPreferences />);

    await user.click(screen.getByRole("button", { name: "130%" }));

    expect(document.documentElement.style.fontSize).toBe("130%");
    expect(screen.getByTestId("display-preview")).toHaveAttribute("data-text-size", "130");
  });

  it("persists palette selection", async () => {
    const user = userEvent.setup();
    renderWithProvider(<PaletteSelector />);

    await user.click(screen.getByRole("button", { name: /Color-blind safe/ }));

    expect(document.documentElement).toHaveAttribute("data-palette", "color-blind");
    expect(JSON.parse(localStorage.getItem("ss-preferences")!).palette).toBe("color-blind");
  });
});
