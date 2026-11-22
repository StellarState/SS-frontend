import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProofOfReservesDashboard } from "../ProofOfReservesDashboard";

describe("ProofOfReservesDashboard Component (#677)", () => {
  it("renders public reserves page with total obligations reconciled to assets", () => {
    render(<ProofOfReservesDashboard />);

    // Page works while logged out - no auth provider required
    expect(screen.getByTestId("proof-of-reserves-dashboard")).toBeInTheDocument();

    // Assets, obligations and gap values
    expect(screen.getByTestId("value-total-assets")).toHaveTextContent("$10,500,000");
    expect(screen.getByTestId("value-total-obligations")).toHaveTextContent("$9,500,000");
    expect(screen.getByTestId("value-reserve-gap")).toHaveTextContent("+$1,000,000 USDC");
    expect(screen.getByTestId("reconciled-obligations-total")).toHaveTextContent("$9,500,000 USDC");

    // Healthy badge shown initially
    expect(screen.getByTestId("status-badge-healthy")).toBeInTheDocument();
  });

  it("shows visible snapshot age and updates on refresh", () => {
    render(<ProofOfReservesDashboard />);

    const ageIndicator = screen.getByTestId("snapshot-age-indicator");
    expect(ageIndicator).toBeInTheDocument();
    expect(ageIndicator).toHaveTextContent("Snapshot Age:");

    const refreshBtn = screen.getByTestId("refresh-button");
    fireEvent.click(refreshBtn);
    expect(screen.getByTestId("snapshot-age-indicator")).toBeInTheDocument();
  });

  it("renders verifiable explorer links for accounts with on-chain addresses", () => {
    render(<ProofOfReservesDashboard />);

    const stellarExplorerLink = screen.getByTestId("explorer-link-acc-1");
    expect(stellarExplorerLink).toHaveAttribute(
      "href",
      "https://stellar.expert/explorer/public/account/GDUSC4MAINNETESCROWSETTLEPOOL2026771ABCDEF1234567890STLT"
    );

    const ethExplorerLink = screen.getByTestId("explorer-link-acc-3");
    expect(ethExplorerLink).toHaveAttribute(
      "href",
      "https://etherscan.io/address/0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
    );
  });

  it("handles missing attestations safely without breaking rendering", () => {
    render(<ProofOfReservesDashboard />);

    // Acc-4 is bank-escrow without attestation
    const missingAttestationIndicator = screen.getByTestId("attestation-missing-acc-4");
    expect(missingAttestationIndicator).toHaveTextContent("No third-party attestation filed");

    // Acc-1 has attestation
    const validAttestation = screen.getByTestId("attestation-link-acc-1");
    expect(validAttestation).toHaveAttribute(
      "href",
      "https://attestation.stellarsele.org/reports/2026-11-primary.pdf"
    );
    expect(validAttestation).toHaveTextContent("Grant Thornton LLP");
  });

  it("transitions into gap/deficit state and displays numeric deficit alert", () => {
    render(<ProofOfReservesDashboard />);

    const gapBtn = screen.getByTestId("simulate-gap-btn");
    fireEvent.click(gapBtn);

    expect(screen.getByTestId("status-badge-gap")).toBeInTheDocument();
    expect(screen.getByTestId("alert-undercollateralized")).toBeInTheDocument();
    expect(screen.getByTestId("value-reserve-gap")).toHaveTextContent("-$");
  });

  it("transitions into stale state and displays freshness warning", () => {
    render(<ProofOfReservesDashboard />);

    const staleBtn = screen.getByTestId("simulate-stale-btn");
    fireEvent.click(staleBtn);

    expect(screen.getByTestId("status-badge-stale")).toBeInTheDocument();
    expect(screen.getByTestId("alert-stale")).toBeInTheDocument();
    expect(screen.getByTestId("snapshot-age-indicator")).toHaveTextContent("Stale > 24h");
  });

  it("allows filtering accounts by network", () => {
    render(<ProofOfReservesDashboard />);

    expect(screen.getByTestId("account-card-acc-1")).toBeInTheDocument();
    expect(screen.getByTestId("account-card-acc-3")).toBeInTheDocument();

    const ethFilterBtn = screen.getByRole("button", { name: "Ethereum" });
    fireEvent.click(ethFilterBtn);

    expect(screen.queryByTestId("account-card-acc-1")).not.toBeInTheDocument();
    expect(screen.getByTestId("account-card-acc-3")).toBeInTheDocument();
  });
});
