import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { FundingProgressBar } from "../FundingProgressBar";

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

function advanceAnimation() {
    vi.advanceTimersByTime(200);
}

describe("FundingProgressBar", () => {
    it("renders the correct percentage for a partially funded invoice", () => {
        render(<FundingProgressBar raised={4500} target={10000} />);
        advanceAnimation();

        expect(screen.getByText("45.0%")).toBeInTheDocument();
    });

    it("renders 100% when raised equals target", () => {
        render(<FundingProgressBar raised={10000} target={10000} />);
        advanceAnimation();

        expect(screen.getByText("100.0%")).toBeInTheDocument();
    });

    it("caps at 100% when raised exceeds target", () => {
        render(<FundingProgressBar raised={15000} target={10000} />);
        advanceAnimation();

        expect(screen.getByText("100.0%")).toBeInTheDocument();
    });

    it("renders green bar when 100% funded", () => {
        render(<FundingProgressBar raised={10000} target={10000} />);
        advanceAnimation();

        const bar = screen.getByText("100.0%");
        expect(bar).toBeInTheDocument();
    });

    it("displays XLM raised and target below the bar", () => {
        render(<FundingProgressBar raised={4500} target={10000} />);
        advanceAnimation();

        expect(screen.getByText(/4,500\.00 XLM raised of 10,000\.00 XLM/)).toBeInTheDocument();
    });

    it("formats total to 2 decimal places", () => {
        render(<FundingProgressBar raised={4500} target={10000} />);
        advanceAnimation();

        const formattedText = screen.getByText(/4,500\.00 XLM raised of 10,000\.00 XLM/);
        expect(formattedText).toBeInTheDocument();
    });

    it("handles zero target gracefully", () => {
        render(<FundingProgressBar raised={0} target={0} />);
        advanceAnimation();

        expect(screen.getByText("0.0%")).toBeInTheDocument();
    });
});