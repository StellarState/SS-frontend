import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SellerTaxProfileSettings } from "@/components/dashboard/SellerTaxProfileSettings";

vi.mock("@/lib/api", async (original) => ({
  ...(await original<typeof import("@/lib/api")>()),
  fetchSellerTaxProfile: vi.fn(), saveSellerTaxProfile: vi.fn(),
}));
import { fetchSellerTaxProfile, saveSellerTaxProfile } from "@/lib/api";

function renderSettings() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><SellerTaxProfileSettings previewAmount={2000} /></QueryClientProvider>);
}

describe("SellerTaxProfileSettings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("masks the tax identifier and previews withholding from the jurisdiction rate", async () => {
    vi.mocked(fetchSellerTaxProfile).mockResolvedValue({
      entityType: "Company", jurisdiction: "NG", residenceCountry: "NG", taxIdLast4: "7319",
      complete: true, withholdingRate: 5, requiredFields: [], updatedAt: "2026-11-22T10:00:00Z",
    });
    renderSettings();
    expect(await screen.findByTestId("masked-tax-id")).toHaveTextContent("7319");
    expect(screen.getByTestId("withholding-preview")).toHaveTextContent("100 XLM withheld");
    expect(screen.queryByText("1234567319")).not.toBeInTheDocument();
  });

  it("requires all jurisdiction profile fields before saving", async () => {
    vi.mocked(fetchSellerTaxProfile).mockResolvedValue(null);
    renderSettings();
    fireEvent.click(await screen.findByRole("button", { name: "Save tax profile" }));
    expect(screen.getByLabelText("Entity type")).toBeRequired();
    expect(screen.getByLabelText("Tax jurisdiction")).toBeRequired();
    expect(screen.getByLabelText("Residence country")).toBeRequired();
    expect(screen.getByLabelText("Tax ID")).toBeRequired();
    expect(saveSellerTaxProfile).not.toHaveBeenCalled();
  });
});
