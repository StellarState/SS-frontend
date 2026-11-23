import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { UnderwriterProfileCard } from "@/components/underwriting/UnderwriterProfileCard";
import {
  sanitizeUnderwriterProfile,
  type UnderwriterProfile,
} from "@/lib/underwriting/reputationProfile";

describe("UnderwriterProfileCard Component", () => {
  const mockProfile: UnderwriterProfile = sanitizeUnderwriterProfile({
    id: "uw-test-card",
    name: "Apex Risk Partners",
    address: "GBV5S74OIWYREQGBNXORIC2D4Y66YMOUQPVIXBHKFPF637GKJKENZBYV",
    totalCapacity: 1_000_000,
    activeCover: 600_000,
    reservedCover: 150_000,
    totalLosses: 5000,
    totalStaked: 350_000,
    slashingHistory: [
      {
        id: "slash-1",
        timestamp: "2026-10-10T12:00:00Z",
        reason: "Arbitration delay",
        amount: 5000,
        txHash: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      },
    ],
    invoiceHistory: [
      { id: "1", invoiceId: "INV-1", amount: 100000, status: "settled" },
      { id: "2", invoiceId: "INV-2", amount: 120000, status: "settled" },
      { id: "3", invoiceId: "INV-3", amount: 80000, status: "settled" },
      { id: "4", invoiceId: "INV-4", amount: 50000, status: "active" },
    ],
  });

  it("renders underwriter header details with public address and tier", () => {
    render(<UnderwriterProfileCard profile={mockProfile} />);

    expect(screen.getByTestId("underwriter-name")).toHaveTextContent("Apex Risk Partners");
    expect(screen.getByTestId("underwriter-tier-badge")).toHaveTextContent(/platinum/i);
    expect(screen.getByTestId("underwriter-address")).toBeInTheDocument();
  });

  it("displays reputation score, sample count, and confidence interval", () => {
    render(<UnderwriterProfileCard profile={mockProfile} />);

    expect(screen.getByTestId("reputation-score")).toHaveTextContent("100/100");
    expect(screen.getByTestId("reputation-sample-count")).toHaveTextContent("Evaluated on 3 settled/defaulted samples");
    expect(screen.getByTestId("reputation-confidence-range")).toBeInTheDocument();

    expect(screen.getByTestId("settled-count")).toHaveTextContent("3");
    expect(screen.getByTestId("defaulted-count")).toHaveTextContent("0");
    expect(screen.getByTestId("active-count")).toHaveTextContent("1");
  });

  it("displays capacity reconciliation breakdown and utilization rate", () => {
    render(<UnderwriterProfileCard profile={mockProfile} />);

    expect(screen.getByTestId("total-capacity")).toHaveTextContent("$1,000,000");
    expect(screen.getByTestId("active-cover")).toHaveTextContent("$600,000");
    expect(screen.getByTestId("reserved-cover")).toHaveTextContent("$150,000");
    expect(screen.getByTestId("available-capacity")).toHaveTextContent("$250,000");
    expect(screen.getByTestId("utilization-rate")).toHaveTextContent("75%");
    expect(screen.getByTestId("capacity-available-badge")).toHaveTextContent("Available");
  });

  it("renders slashing event audit log with reason, amount, and tx hash", () => {
    render(<UnderwriterProfileCard profile={mockProfile} />);

    expect(screen.getByTestId("slashing-events-list")).toBeInTheDocument();
    expect(screen.getByText("Arbitration delay")).toBeInTheDocument();
    expect(screen.getByText("-$5,000")).toBeInTheDocument();
    expect(screen.getByTestId("slashing-tx-hash")).toBeInTheDocument();
  });

  it("displays clean record banner when there are 0 slashing events", () => {
    const cleanProfile = sanitizeUnderwriterProfile({
      ...mockProfile,
      slashingHistory: [],
    });

    render(<UnderwriterProfileCard profile={cleanProfile} />);

    expect(screen.getByTestId("no-slashing-notice")).toHaveTextContent(/Clean track record/i);
  });

  it("toggles follow state and calls callback when follow button is clicked", () => {
    const onFollowToggle = vi.fn();
    render(<UnderwriterProfileCard profile={mockProfile} onFollowToggle={onFollowToggle} />);

    const followBtn = screen.getByTestId("follow-underwriter-btn");
    expect(followBtn).toHaveTextContent("Follow");

    fireEvent.click(followBtn);
    expect(onFollowToggle).toHaveBeenCalledWith("uw-test-card", true);
    expect(followBtn).toHaveTextContent("Following");
  });
});
