import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { UnderwriterDirectory } from "@/components/underwriting/UnderwriterDirectory";
import { MOCK_UNDERWRITERS } from "@/lib/underwriting/mockData";

describe("UnderwriterDirectory Component", () => {
  it("renders directory title, aggregate statistics, and underwriter cards", () => {
    render(<UnderwriterDirectory initialUnderwriters={MOCK_UNDERWRITERS} />);

    expect(screen.getByText("Underwriter Directory")).toBeInTheDocument();
    expect(screen.getByTestId("stat-underwriter-count")).toHaveTextContent(String(MOCK_UNDERWRITERS.length));
    expect(screen.getByTestId("stat-total-capacity")).toBeInTheDocument();
    expect(screen.getByTestId("stat-active-cover")).toBeInTheDocument();
    expect(screen.getByTestId("stat-available-capacity")).toBeInTheDocument();

    expect(screen.getByTestId("underwriters-list")).toBeInTheDocument();
    expect(screen.getByText("Aurora Capital Underwriters")).toBeInTheDocument();
  });

  it("filters underwriters by search query matching name or address", () => {
    render(<UnderwriterDirectory initialUnderwriters={MOCK_UNDERWRITERS} />);

    const searchInput = screen.getByTestId("search-underwriter-input");

    // Search for "Aurora"
    fireEvent.change(searchInput, { target: { value: "Aurora" } });
    expect(screen.getByText("Aurora Capital Underwriters")).toBeInTheDocument();
    expect(screen.queryByText("NovaFleet Capital")).not.toBeInTheDocument();

    // Clear search
    fireEvent.change(searchInput, { target: { value: "" } });
    expect(screen.getByText("NovaFleet Capital")).toBeInTheDocument();
  });

  it("filters underwriters by capacity tier", () => {
    render(<UnderwriterDirectory initialUnderwriters={MOCK_UNDERWRITERS} />);

    // Click "High Capacity ($500k+)"
    const highCapBtn = screen.getByTestId("filter-capacity-high-capacity");
    fireEvent.click(highCapBtn);

    expect(screen.getByText("Aurora Capital Underwriters")).toBeInTheDocument();
    // NovaFleet Capital has 300k, should be filtered out
    expect(screen.queryByText("NovaFleet Capital")).not.toBeInTheDocument();
  });

  it("shows empty state when no underwriters match search", () => {
    render(<UnderwriterDirectory initialUnderwriters={MOCK_UNDERWRITERS} />);

    const searchInput = screen.getByTestId("search-underwriter-input");
    fireEvent.change(searchInput, { target: { value: "NonexistentUnderwriterXYZ" } });

    expect(screen.getByTestId("no-underwriters-found")).toBeInTheDocument();
  });
});
