import * as Freighter from "@stellar/freighter-api";

export type Network = "mainnet" | "testnet";

export async function connectWallet(): Promise<{
  address: string;
  network: Network;
} | null> {
  try {
    const connected = await Freighter.isConnected();
    if (!connected) {
      const address = await Freighter.requestAccess();
      if (!address) return null;
      const network = await Freighter.getNetwork();
      return { address, network: network === "PUBLIC" ? "mainnet" : "testnet" };
    }
    const address = await Freighter.getPublicKey();
    const network = await Freighter.getNetwork();
    return { address, network: network === "PUBLIC" ? "mainnet" : "testnet" };
  } catch {
    return null;
  }
}

export async function getNetwork(): Promise<Network | null> {
  try {
    const connected = await Freighter.isConnected();
    if (!connected) return null;
    const network = await Freighter.getNetwork();
    return network === "PUBLIC" ? "mainnet" : "testnet";
  } catch {
    return null;
  }
}

export async function getAddress(): Promise<string | null> {
  try {
    const connected = await Freighter.isConnected();
    if (!connected) return null;
    return await Freighter.getPublicKey();
  } catch {
    return null;
  }
}

export function truncateAddress(address: string): string {
  if (address.length <= 8) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
