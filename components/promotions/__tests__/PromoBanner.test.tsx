import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PromoBanner } from "../PromoBanner";

vi.mock("@/context/WalletContext", () => ({
  useWallet: () => ({ address: "GTESTWALLET" }),
}));

function respond(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function renderBanner() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <PromoBanner />
    </QueryClientProvider>
  );
}

const baseCampaign = {
  id: "promo-1",
  title: "Wave promo",
  discount_percentage: 25,
  starts_at: "2026-11-20T00:00:00.000Z",
  ends_at: "2030-11-22T00:00:00.000Z",
  remaining_budget: 1000,
  eligibility: "All",
  allowlist: [],
};

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  window.localStorage.clear();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(Date, "now").mockReturnValue(new Date("2026-11-21T12:00:00.000Z").getTime());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("PromoBanner", () => {
  it("shows the best active offer and persists dismissal per campaign", async () => {
    fetchMock.mockResolvedValueOnce(respond(200, { campaigns: [baseCampaign] }));
    const user = userEvent.setup();
    const { unmount } = renderBanner();

    const banner = await screen.findByTestId("promo-banner");
    expect(banner).toHaveTextContent("25% fee off");
    expect(screen.getByTestId("promo-budget")).toHaveTextContent("1,000 XLM");
    expect(screen.getByTestId("campaign-countdown")).toBeInTheDocument();

    await user.click(screen.getByTestId("promo-dismiss"));
    expect(screen.queryByTestId("promo-banner")).not.toBeInTheDocument();
    expect(window.localStorage.getItem("ss:promo-dismissed:promo-1")).toBe("1");

    unmount();
    fetchMock.mockResolvedValueOnce(respond(200, { campaigns: [baseCampaign] }));
    renderBanner();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(screen.queryByTestId("promo-banner")).not.toBeInTheDocument();
  });

  it("shows eligibility messaging for allowlist campaigns", async () => {
    fetchMock.mockResolvedValueOnce(
      respond(200, {
        campaigns: [
          {
            ...baseCampaign,
            id: "promo-allowlist",
            eligibility: "Allowlist",
            allowlist: ["GOTHERWALLET"],
          },
        ],
      })
    );
    renderBanner();

    const notice = await screen.findByTestId("promo-banner-ineligible");
    expect(notice).toHaveTextContent("not on the allowlist");
    expect(screen.queryByTestId("promo-discount")).not.toBeInTheDocument();
  });

  it("removes the discount when the budget is exhausted", async () => {
    fetchMock.mockResolvedValueOnce(
      respond(200, { campaigns: [{ ...baseCampaign, remaining_budget: 0 }] })
    );
    renderBanner();

    expect(await screen.findByTestId("promo-status-notice")).toHaveTextContent("used its budget");
    expect(screen.queryByTestId("promo-banner")).not.toBeInTheDocument();
  });
});
