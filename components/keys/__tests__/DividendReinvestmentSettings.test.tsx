import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DividendReinvestmentSettings } from "@/components/keys/DividendReinvestmentSettings";

vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ jwt: "test-token" }) }));
vi.mock("@/lib/api", async (original) => ({
  ...(await original<typeof import("@/lib/api")>()),
  fetchKeyReinvestmentSettings: vi.fn(), saveKeyReinvestmentSettings: vi.fn(),
  previewDividendReinvestment: vi.fn(), confirmDividendReinvestment: vi.fn(),
}));
import { confirmDividendReinvestment, fetchKeyReinvestmentSettings, previewDividendReinvestment, saveKeyReinvestmentSettings } from "@/lib/api";

function renderSettings() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><DividendReinvestmentSettings keyId="key-1" /></QueryClientProvider>);
}

describe("DividendReinvestmentSettings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires preview and a separate confirmation, then refreshes wallet activity", async () => {
    vi.mocked(fetchKeyReinvestmentSettings).mockResolvedValue({ enabled: false, defaultEnabled: false });
    vi.mocked(previewDividendReinvestment).mockResolvedValue({ expectedKeys: 2, estimatedFee: 0.5, distributionAmount: 20 });
    vi.mocked(confirmDividendReinvestment).mockResolvedValue({ success: true, availableAmount: 0 });
    renderSettings();
    fireEvent.change(await screen.findByLabelText("Distribution amount (XLM)"), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(await screen.findByTestId("reinvestment-confirmation")).toHaveTextContent("2");
    expect(confirmDividendReinvestment).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm reinvestment" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Activity will appear in wallet history");
    expect(confirmDividendReinvestment).toHaveBeenCalledWith("key-1", 20, "test-token");
  });

  it("keeps failed reinvestments available as cash", async () => {
    vi.mocked(fetchKeyReinvestmentSettings).mockResolvedValue({ enabled: true, defaultEnabled: true });
    vi.mocked(previewDividendReinvestment).mockResolvedValue({ expectedKeys: 1, estimatedFee: 0.1, distributionAmount: 10 });
    vi.mocked(confirmDividendReinvestment).mockRejectedValue(new Error("not enough balance"));
    renderSettings();
    fireEvent.change(await screen.findByLabelText("Distribution amount (XLM)"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirm reinvestment" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Your dividend remains available as cash");
    expect(saveKeyReinvestmentSettings).not.toHaveBeenCalled();
  });
});
