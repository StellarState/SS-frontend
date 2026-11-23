import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const available: Record<string, boolean> = { freighter: false, albedo: false };
let walletError: string | null = null;

vi.mock("@/lib/stellar", () => ({
  SUPPORTED_WALLETS: ["freighter", "albedo"],
  WALLET_LABELS: { freighter: "Freighter", albedo: "Albedo" },
  WALLET_INSTALL_URLS: { freighter: "https://www.freighter.app/", albedo: "https://albedo.to/" },
  isWalletAvailable: vi.fn(async (w: string) => available[w]),
}));

vi.mock("@/context/WalletContext", () => ({
  useWallet: () => ({ error: walletError, network: "testnet", address: "GSECRETADDRESS" }),
}));

import { classifyWalletFailure } from "@/hooks/useWalletDetection";
import { WalletHelpModal, buildDiagnostics, orderedFixes } from "../WalletHelpModal";

describe("classifyWalletFailure", () => {
  it("covers each detection outcome", () => {
    expect(classifyWalletFailure({ freighter: false, albedo: false })).toBe("not_installed");
    expect(classifyWalletFailure({ freighter: true, albedo: false })).toBeNull();
    expect(classifyWalletFailure({ freighter: true, albedo: false }, "Connection request was declined")).toBe("declined");
    expect(classifyWalletFailure({ freighter: true, albedo: false }, "Wallet extension not detected")).toBe("not_installed");
    expect(classifyWalletFailure({ freighter: true, albedo: false }, "Failed to connect wallet")).toBe("connection_failed");
  });

  it("puts the most relevant fix first", () => {
    expect(orderedFixes("declined")[0].id).toBe("locked");
    expect(orderedFixes("connection_failed")[0].id).toBe("popups");
    expect(orderedFixes(null)).toHaveLength(4);
  });
});

describe("WalletHelpModal", () => {
  beforeEach(() => {
    available.freighter = false;
    available.albedo = false;
    walletError = null;
  });

  it("shows install options for every wallet when none is installed", async () => {
    render(<WalletHelpModal open onOpenChange={() => {}} />);
    expect(await screen.findByTestId("help-install-freighter")).toHaveAttribute("href", "https://www.freighter.app/");
    expect(screen.getByTestId("help-install-albedo")).toBeInTheDocument();
  });

  it("recheck refreshes detection without a reload", async () => {
    render(<WalletHelpModal open onOpenChange={() => {}} />);
    await screen.findByTestId("help-install-freighter");
    available.freighter = true;
    fireEvent.click(screen.getByTestId("help-recheck"));
    await waitFor(() => expect(screen.queryByTestId("help-install-freighter")).not.toBeInTheDocument());
  });

  it("copied diagnostics contain no addresses or keys", () => {
    const text = buildDiagnostics({ availability: { freighter: true, albedo: false }, reason: "declined" }, "testnet");
    expect(text).toContain('"reason": "declined"');
    expect(text).not.toMatch(/\bG[A-Z2-7]{55}\b|\bS[A-Z2-7]{55}\b|GSECRETADDRESS/);
  });
});
