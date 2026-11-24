import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LockupIndicator } from "../LockupIndicator";

afterEach(() => {
  vi.useRealTimers();
});

describe("LockupIndicator", () => {
  it("shows days remaining before the final 24-hour countdown", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-23T12:00:00.000Z"));

    render(<LockupIndicator expiresAt="2026-11-25T00:00:00.000Z" />);

    expect(screen.getByTestId("lockup-badge")).toHaveTextContent("Locked · 2 days left");
  });

  it("shows a countdown during the final 24 hours", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-23T12:00:00.000Z"));

    render(
      <LockupIndicator expiresAt="2026-11-24T11:30:00.000Z" />,
    );
    expect(screen.getByTestId("lockup-countdown")).toHaveTextContent(
      "Unlocks in 23h 30m",
    );
  });

  it("removes the indicator when the expiry time arrives", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-23T12:00:00.000Z"));

    render(<LockupIndicator expiresAt="2026-11-23T12:00:30.000Z" />);
    expect(screen.getByTestId("lockup-countdown")).toHaveTextContent(
      "Unlocks in less than 1 minute",
    );

    act(() => {
      vi.advanceTimersByTime(30_001);
    });

    expect(screen.queryByTestId("lockup-countdown")).not.toBeInTheDocument();
    expect(screen.queryByTestId("lockup-badge")).not.toBeInTheDocument();
  });
});
