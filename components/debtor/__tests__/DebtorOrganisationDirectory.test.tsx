import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { DebtorOrganisationDirectory } from "@/components/debtor/DebtorOrganisationDirectory";

describe("DebtorOrganisationDirectory Component (Issue #665)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders directory header and organization cards", () => {
    render(<DebtorOrganisationDirectory />);
    expect(screen.getByTestId("debtor-organisation-directory")).toBeDefined();
    expect(
      screen.getByText("Debtor Organisation Directory"),
    ).toBeDefined();
    expect(screen.getByText("Apex Logistics International")).toBeDefined();
    expect(screen.getByText("Nordic CleanTech Group")).toBeDefined();
  });

  it("filters debtor organisations by search query", () => {
    render(<DebtorOrganisationDirectory />);
    const searchInput = screen.getByLabelText(
      "Search by organisation name or jurisdiction",
    ) as HTMLInputElement;

    fireEvent.change(searchInput, { target: { value: "Sweden" } });
    expect(screen.getByText("Nordic CleanTech Group")).toBeDefined();
    expect(screen.queryByText("Apex Logistics International")).toBeNull();
  });

  it("filters debtor organisations by status", () => {
    render(<DebtorOrganisationDirectory />);
    const select = screen.getByLabelText("Filter by status") as HTMLSelectElement;

    fireEvent.change(select, { target: { value: "Watch" } });
    expect(screen.getByText("Helios Solar Supply Co.")).toBeDefined();
    expect(screen.queryByText("Apex Logistics International")).toBeNull();
  });

  it("toggles debtor watch status and updates button label", () => {
    render(<DebtorOrganisationDirectory />);
    const watchBtn = screen.getByTestId("watch-btn-org-2");
    expect(watchBtn.textContent).toContain("Watch");

    fireEvent.click(watchBtn);
    expect(watchBtn.textContent).toContain("Watching");
  });

  it("expands and displays recent invoices when clicking View Details", () => {
    render(<DebtorOrganisationDirectory />);
    const viewDetailsBtns = screen.getAllByText("View Details");
    fireEvent.click(viewDetailsBtns[0]);

    expect(screen.getByText("Recent Invoices")).toBeDefined();
    expect(screen.getByText("APX-882")).toBeDefined();
  });
});
