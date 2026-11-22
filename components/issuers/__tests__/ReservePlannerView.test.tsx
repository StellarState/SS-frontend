import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { ReservePlannerView } from "../ReservePlannerView";
import type { Obligation, ScheduledContribution } from "@/lib/analytics/reservePlanner";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({
    address: "GBJ5K2W3Y6D...MOCK",
    jwt: null,
    isAuthenticated: true,
  })),
}));

function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const mockObligations: Obligation[] = [
  {
    id: "ob-1",
    title: "Supplier Alpha settlement",
    amount: 10000,
    due_date: "2026-12-01",
    status: "upcoming",
  },
  {
    id: "ob-2",
    title: "Logistics settlement",
    amount: 5000,
    due_date: "2026-12-15",
    status: "upcoming",
  },
];

const mockContributions: ScheduledContribution[] = [
  {
    id: "sc-1",
    label: "Treasury Deposit",
    amount: 3000,
    scheduled_date: "2026-11-28",
  },
];

describe("ReservePlannerView (#694)", () => {
  it("renders key metrics, target obligations, and shortfall accurately", () => {
    // Balance 5000, target 15000, contrib 3000 -> projected 8000 -> shortfall 7000
    renderWithClient(
      <ReservePlannerView
        options={{
          initialBalance: 5000,
          initialObligations: mockObligations,
          initialContributions: mockContributions,
          initialAsOfDate: "2026-12-31",
        }}
      />,
    );

    expect(screen.getByTestId("current-balance-val")).toHaveTextContent("$5,000.00");
    expect(screen.getByTestId("target-obligations-val")).toHaveTextContent("$15,000.00");
    expect(screen.getByTestId("scheduled-contributions-val")).toHaveTextContent("$3,000.00");
    expect(screen.getByTestId("shortfall-val")).toHaveTextContent("-$7,000.00");

    // Shortfall notification should be visible
    expect(screen.getByTestId("shortfall-notification")).toBeInTheDocument();
  });

  it("renders fully funded state and ensures shortfall notification stops when target is met", () => {
    // Balance 15000, target 15000 -> funded, surplus 3000
    renderWithClient(
      <ReservePlannerView
        options={{
          initialBalance: 15000,
          initialObligations: mockObligations,
          initialContributions: mockContributions,
          initialAsOfDate: "2026-12-31",
        }}
      />,
    );

    expect(screen.getByTestId("surplus-val")).toHaveTextContent("Fully Funded (+$3,000.00)");
    // Acceptance criteria: Notifications stop after target is met
    expect(screen.queryByTestId("shortfall-notification")).not.toBeInTheDocument();
  });

  it("renders overdue warning banner when an overdue obligation is present", () => {
    const overdueObligations: Obligation[] = [
      {
        id: "ob-overdue",
        title: "Overdue note",
        amount: 4000,
        due_date: "2026-10-01",
        status: "overdue",
      },
    ];

    renderWithClient(
      <ReservePlannerView
        options={{
          initialBalance: 1000,
          initialObligations: overdueObligations,
          initialContributions: [],
          initialAsOfDate: "2026-12-31",
        }}
      />,
    );

    expect(screen.getByTestId("overdue-warning-banner")).toBeInTheDocument();
  });

  it("allows adding and removing scheduled contributions", () => {
    renderWithClient(
      <ReservePlannerView
        options={{
          initialBalance: 5000,
          initialObligations: mockObligations,
          initialContributions: mockContributions,
          initialAsOfDate: "2026-12-31",
        }}
      />,
    );

    // Initial contribution row is rendered
    expect(screen.getByTestId("contribution-row-sc-1")).toBeInTheDocument();

    // Fill form to add contribution
    fireEvent.change(screen.getByTestId("contrib-label-input"), {
      target: { value: "New Partner Advance" },
    });
    fireEvent.change(screen.getByTestId("contrib-amount-input"), {
      target: { value: "4500" },
    });
    fireEvent.change(screen.getByTestId("contrib-date-input"), {
      target: { value: "2026-12-05" },
    });

    fireEvent.click(screen.getByTestId("submit-contribution-btn"));

    // Check that new contribution appears
    expect(screen.getByText("New Partner Advance")).toBeInTheDocument();

    // Remove the initial contribution
    const removeBtn = screen.getByTestId("remove-contrib-btn-sc-1");
    fireEvent.click(removeBtn);

    expect(screen.queryByTestId("contribution-row-sc-1")).not.toBeInTheDocument();
  });

  it("updates calculation when changing projection date", () => {
    renderWithClient(
      <ReservePlannerView
        options={{
          initialBalance: 5000,
          initialObligations: mockObligations,
          initialContributions: mockContributions,
          initialAsOfDate: "2026-12-05", // only ob-1 is due by this date
        }}
      />,
    );

    // Only ob-1 ($10,000) is due by 2026-12-05
    expect(screen.getByTestId("target-obligations-val")).toHaveTextContent("$10,000.00");

    // Change target date to 2026-12-20 so both obligations ($15,000) are included
    fireEvent.change(screen.getByTestId("target-date-picker"), {
      target: { value: "2026-12-20" },
    });

    expect(screen.getByTestId("target-obligations-val")).toHaveTextContent("$15,000.00");
  });

  it("exports CSV on button click", () => {
    const createObjectURLMock = vi.fn().mockReturnValue("blob:mock-url");
    const revokeObjectURLMock = vi.fn();
    window.URL.createObjectURL = createObjectURLMock;
    window.URL.revokeObjectURL = revokeObjectURLMock;

    renderWithClient(
      <ReservePlannerView
        options={{
          initialBalance: 5000,
          initialObligations: mockObligations,
          initialContributions: mockContributions,
          initialAsOfDate: "2026-12-31",
        }}
      />,
    );

    const exportBtn = screen.getByTestId("export-csv-button");
    fireEvent.click(exportBtn);

    expect(createObjectURLMock).toHaveBeenCalled();
  });
});
