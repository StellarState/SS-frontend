import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MarketplaceSortHeader } from "../sort-header";
import { DEFAULT_SORT_STATE } from "@/lib/invoice-sort";

describe("MarketplaceSortHeader", () => {
  it("renders both sortable column labels", () => {
    render(
      <MarketplaceSortHeader sort={DEFAULT_SORT_STATE} onSort={vi.fn()} />
    );
    expect(screen.getByRole("button", { name: /sort by face value/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sort by deadline/i })).toBeInTheDocument();
  });

  it("does not mark any column as active by default", () => {
    render(
      <MarketplaceSortHeader sort={DEFAULT_SORT_STATE} onSort={vi.fn()} />
    );
    expect(
      screen.getByRole("button", { name: /sort by face value/i })
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.getByRole("button", { name: /sort by deadline/i })
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("marks the active column as pressed", () => {
    render(
      <MarketplaceSortHeader
        sort={{ key: "faceValue", order: "asc" }}
        onSort={vi.fn()}
      />
    );
    expect(
      screen.getByRole("button", { name: /sort by face value/i })
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("calls onSort with the clicked column key", () => {
    const onSort = vi.fn();
    render(<MarketplaceSortHeader sort={DEFAULT_SORT_STATE} onSort={onSort} />);
    fireEvent.click(screen.getByRole("button", { name: /sort by deadline/i }));
    expect(onSort).toHaveBeenCalledWith("deadline");
  });
});
