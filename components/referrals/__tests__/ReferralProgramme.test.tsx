import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReferralProgramme } from "../ReferralProgramme";
import type { ReferralTierStatus } from "@/lib/api";

const mockTier = vi.fn();
const mockWallet = vi.fn();
const mockInvalidateQueries = vi.fn();

vi.mock("@/hooks/useReferralTier", () => ({
  useReferralTier: () => mockTier(),
  REFERRAL_TIER_QUERY_KEY: ["referral-tier"],
}));

vi.mock("@/context/WalletContext", () => ({
  useWallet: () => mockWallet(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
}));

const tiers: ReferralTierStatus["tiers"] = [
  { tier: "standard", threshold: 0, commission_rate: 2 },
  { tier: "plus", threshold: 10000, commission_rate: 4 },
  { tier: "elite", threshold: 50000, commission_rate: 6 },
];

function setupTier() {
  mockTier.mockReturnValue({
    data: {
      tier: "standard",
      cumulative_referred_volume: 4000,
      tiers,
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
}

describe("ReferralProgramme Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWallet.mockReturnValue({ address: "G_CURRENT_USER_WALLET", isConnected: true });
    setupTier();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("renders referral code and link settings with copy action", async () => {
    render(<ReferralProgramme />);
    expect(screen.getByTestId("referral-code-display")).toHaveTextContent("STELLAR-7K2Q9A");
    const input = screen.getByTestId("referral-link-input") as HTMLInputElement;
    expect(input.value).toContain("/signup?ref=STELLAR-7K2Q9A");

    const copyBtn = screen.getByTestId("copy-referral-link-btn");
    await fireEvent.click(copyBtn);
    await waitFor(() => expect(copyBtn).toHaveTextContent(/copied/i));
  });

  it("separates qualified, funded, and retained accounts in metric cards", () => {
    render(<ReferralProgramme />);
    expect(screen.getByTestId("qualified-count")).toBeInTheDocument();
    expect(screen.getByTestId("funded-count")).toBeInTheDocument();
    expect(screen.getByTestId("retained-count")).toBeInTheDocument();
  });

  it("shows pending, paid, and reversed rewards accurately", () => {
    render(<ReferralProgramme />);
    expect(screen.getByTestId("pending-rewards-total")).toHaveTextContent("XLM");
    expect(screen.getByTestId("paid-rewards-total")).toHaveTextContent("XLM");
    expect(screen.getByTestId("reversed-rewards-total")).toHaveTextContent("XLM");
  });

  it("rejects self-referral attribution with clear warning message", () => {
    render(<ReferralProgramme />);
    const walletInput = screen.getByTestId("referee-wallet-input");
    const submitBtn = screen.getByTestId("attribute-referee-btn");

    // Enter current user's own wallet
    fireEvent.change(walletInput, { target: { value: "G_CURRENT_USER_WALLET" } });
    fireEvent.click(submitBtn);

    expect(screen.getByTestId("attribution-error")).toHaveTextContent(/self-referral is rejected/i);
  });

  it("rejects duplicate referral attribution for already attributed account", () => {
    render(<ReferralProgramme />);
    const walletInput = screen.getByTestId("referee-wallet-input");
    const submitBtn = screen.getByTestId("attribute-referee-btn");

    // Enter referee wallet of ref-101
    fireEvent.change(walletInput, {
      target: { value: "GDA4N3Z7257FAGI5L4U6OPQRV7W72A5U4W6L8F3X5Z2G8Q" },
    });
    fireEvent.click(submitBtn);

    expect(screen.getByTestId("attribution-error")).toHaveTextContent(/duplicate referral rejected/i);
  });

  it("attributes a new valid unique referee account successfully", () => {
    render(<ReferralProgramme />);
    const walletInput = screen.getByTestId("referee-wallet-input");
    const submitBtn = screen.getByTestId("attribute-referee-btn");

    fireEvent.change(walletInput, {
      target: { value: "G_BRAND_NEW_INVESTOR_WALLET_999" },
    });
    fireEvent.click(submitBtn);

    expect(screen.getByTestId("attribution-success")).toHaveTextContent(/successfully attributed/i);
  });

  it("allows reversing a reward and updates the reward state badge", () => {
    render(<ReferralProgramme />);
    const reverseBtn = screen.getByTestId("reverse-reward-btn-ref-101");
    fireEvent.click(reverseBtn);

    expect(screen.getByTestId("reward-state-badge-ref-101")).toHaveTextContent(/reversed/i);
  });

  it("triggers institutional CSV export without throwing errors", () => {
    render(<ReferralProgramme />);
    const exportBtn = screen.getByTestId("export-institutional-csv-btn");

    // Mock URL.createObjectURL and click
    const createObjectURLMock = vi.fn().mockReturnValue("blob:mock-url");
    global.URL.createObjectURL = createObjectURLMock;

    fireEvent.click(exportBtn);
    expect(createObjectURLMock).toHaveBeenCalled();
  });
});
