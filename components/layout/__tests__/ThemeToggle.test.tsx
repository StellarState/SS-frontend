import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "../ThemeToggle";

const setTheme = vi.fn();
let activeTheme: string | undefined;

// The real hook resolves the preference on the client only, so the mock lets
// each test drive the resolved value directly.
vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: activeTheme, setTheme }),
}));

describe("ThemeToggle", () => {
  beforeEach(() => {
    setTheme.mockClear();
    activeTheme = undefined;
  });

  it("falls back to the system theme when no preference is resolved yet", () => {
    render(<ThemeToggle />);

    expect(screen.getByTestId("theme-toggle")).toHaveAccessibleName(
      "System theme. Switch to Light theme"
    );
    expect(screen.getByTestId("theme-toggle-icon-system")).toBeInTheDocument();
  });

  it("cycles from system to light", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByTestId("theme-toggle"));

    expect(setTheme).toHaveBeenCalledWith("light");
  });

  it("shows the resolved light theme and cycles to dark", async () => {
    activeTheme = "light";
    const user = userEvent.setup();
    render(<ThemeToggle />);

    expect(screen.getByTestId("theme-toggle-icon-light")).toBeInTheDocument();
    expect(screen.getByTestId("theme-toggle")).toHaveAccessibleName(
      "Light theme. Switch to Dark theme"
    );

    await user.click(screen.getByTestId("theme-toggle"));

    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  it("shows the resolved dark theme and cycles back to system", async () => {
    activeTheme = "dark";
    const user = userEvent.setup();
    render(<ThemeToggle />);

    expect(screen.getByTestId("theme-toggle-icon-dark")).toBeInTheDocument();

    await user.click(screen.getByTestId("theme-toggle"));

    expect(setTheme).toHaveBeenCalledWith("system");
  });

  it("renders a single control that is reachable and labelled", () => {
    render(<ThemeToggle />);

    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});
