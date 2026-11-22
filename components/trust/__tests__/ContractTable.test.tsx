import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ContractTable } from "@/components/trust/ContractTable";
import type { TrustContract } from "@/lib/trust";

const contracts: TrustContract[] = [
  {
    name: "InvoiceRegistry",
    network: "testnet",
    address: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    version: "2.1.0",
  },
  {
    name: "Vault",
    network: "mainnet",
    address: "CBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
    version: "1.4.2",
  },
];

describe("ContractTable (#655)", () => {
  it("renders every configured contract with network, address and version", () => {
    render(<ContractTable contracts={contracts} copy={vi.fn().mockResolvedValue(undefined)} />);

    expect(screen.getAllByTestId("contract-row")).toHaveLength(2);
    expect(screen.getByText("InvoiceRegistry")).toBeInTheDocument();
    expect(screen.getByText("Vault")).toBeInTheDocument();
    expect(screen.getAllByTestId("contract-address")[0]).toHaveTextContent(contracts[0].address);
    expect(screen.getByText("2.1.0")).toBeInTheDocument();
  });

  it("links each contract to the explorer for its network", () => {
    render(<ContractTable contracts={contracts} copy={vi.fn().mockResolvedValue(undefined)} />);

    const links = screen.getAllByTestId("contract-explorer-link");
    expect(links[0]).toHaveAttribute(
      "href",
      `https://stellar.expert/explorer/testnet/contract/${contracts[0].address}`,
    );
    expect(links[1]).toHaveAttribute(
      "href",
      `https://stellar.expert/explorer/public/contract/${contracts[1].address}`,
    );
  });

  it("copies the exact full address, not a truncated display value", async () => {
    const copy = vi.fn().mockResolvedValue(undefined);
    render(<ContractTable contracts={contracts} copy={copy} />);

    fireEvent.click(screen.getAllByTestId("copy-contract-address")[0]);
    await waitFor(() => expect(copy).toHaveBeenCalledWith(contracts[0].address));
  });

  it("shows an error when copying fails instead of claiming success", async () => {
    render(
      <ContractTable
        contracts={contracts}
        copy={vi.fn().mockRejectedValue(new Error("denied"))}
      />,
    );

    fireEvent.click(screen.getAllByTestId("copy-contract-address")[0]);
    expect(await screen.findByTestId("copy-error")).toBeInTheDocument();
    expect(screen.queryByText("Copied")).not.toBeInTheDocument();
  });
});
