import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { FeeBreakdown } from "@/components/fees/FeeBreakdown";
import { BASE_NETWORK_FEE_XLM } from "@/lib/feeEstimate";

describe("FeeBreakdown (#654)", () => {
  it("blocks confirmation when the balance cannot cover amount, fees and reserve", async () => {
    const onInsufficientBalance = vi.fn();
    const txBuilder = { simulate: vi.fn().mockResolvedValue(0.01) };

    render(
      <FeeBreakdown
        amount={10}
        platformFee={1}
        xlmBalance={5}
        txBuilder={txBuilder}
        onInsufficientBalance={onInsufficientBalance}
        key="insufficient"
      />,
    );

    await waitFor(() =>
      expect(onInsufficientBalance).toHaveBeenCalledWith(true),
    );
    expect(await screen.findByTestId("fee-insufficient")).toBeInTheDocument();
  });

  it("keeps confirmation enabled on simulation failure and shows the fallback", async () => {
    const onInsufficientBalance = vi.fn();
    const txBuilder = { simulate: vi.fn().mockRejectedValue(new Error("RPC down")) };

    render(
      <FeeBreakdown
        amount={10}
        platformFee={1}
        xlmBalance={100}
        txBuilder={txBuilder}
        onInsufficientBalance={onInsufficientBalance}
        key="fallback"
      />,
    );

    expect(await screen.findByTestId("fee-fallback")).toBeInTheDocument();
    await waitFor(() =>
      expect(onInsufficientBalance).toHaveBeenCalledWith(false),
    );
    expect(screen.getByTestId("fee-network")).toHaveTextContent(
      `${BASE_NETWORK_FEE_XLM.toFixed(7)} XLM`,
    );
    expect(screen.queryByTestId("fee-insufficient")).not.toBeInTheDocument();
  });
});
