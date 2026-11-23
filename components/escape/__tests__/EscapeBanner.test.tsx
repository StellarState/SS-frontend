import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { EscapeBanner } from "../EscapeBanner";

const mockStatus = vi.fn();
vi.mock("@/hooks/useEscapeStatus", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/hooks/useEscapeStatus")>()),
  useEscapeStatus: () => mockStatus(),
}));

const NOW = Date.parse("2026-06-01T12:00:00Z");

describe("EscapeBanner (#592)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it("renders nothing while the protocol is running", () => {
    mockStatus.mockReturnValue({ isPaused: false, escapeEnabled: false, escapeAvailableAt: null });
    const { container } = render(<EscapeBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a live countdown before escape opens", () => {
    mockStatus.mockReturnValue({
      isPaused: true,
      escapeEnabled: false,
      escapeAvailableAt: new Date(NOW + 90_000).toISOString(),
    });
    render(<EscapeBanner />);
    expect(screen.getByTestId("escape-countdown")).toHaveTextContent("00h 01m 30s");
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(screen.getByTestId("escape-countdown")).toHaveTextContent("00h 01m 25s");
    expect(screen.queryByTestId("escape-banner-link")).not.toBeInTheDocument();
  });

  it("links to /escape once escape is enabled", () => {
    mockStatus.mockReturnValue({ isPaused: true, escapeEnabled: true, escapeAvailableAt: null });
    render(<EscapeBanner />);
    expect(screen.getByTestId("escape-banner-open")).toBeInTheDocument();
    expect(screen.getByTestId("escape-banner-link")).toHaveAttribute("href", "/escape");
  });
});
