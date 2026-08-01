"use client";

import { useCallback, useEffect, useState } from "react";
import {
  connectWallet,
  getAddress,
  getNetwork,
  type Network,
} from "@/lib/stellar";

interface WalletState {
  address: string | null;
  network: Network | null;
  isConnected: boolean;
  isConnecting: boolean;
  isInitializing: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshNetwork: () => Promise<void>;
}

export function useStellarWallet(): WalletState {
  const [address, setAddress] = useState<string | null>(null);
  const [network, setNetwork] = useState<Network | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    async function init() {
      const addr = await getAddress();
      if (addr) {
        setAddress(addr);
        const net = await getNetwork();
        setNetwork(net);
      }
      setIsInitializing(false);
    }
    init();
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const result = await connectWallet();
      if (result) {
        setAddress(result.address);
        setNetwork(result.network);
      }
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setNetwork(null);
  }, []);

  const refreshNetwork = useCallback(async () => {
    const net = await getNetwork();
    setNetwork(net);
  }, []);

  return {
    address,
    network,
    isConnected: address !== null,
    isConnecting,
    isInitializing,
    connect,
    disconnect,
    refreshNetwork,
  };
}
