"use client";

import { useEffect } from "react";
import { Copy, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { truncateAddress, type Network } from "@/lib/stellar";

interface WalletChipProps {
  address: string;
  network: Network | null;
  onDisconnect: () => void;
  onNetworkChange: () => void;
}

export function WalletChip({
  address,
  network,
  onDisconnect,
  onNetworkChange,
}: WalletChipProps) {
  useEffect(() => {
    function handleStellarNetworkChange() {
      onNetworkChange();
    }
    window.addEventListener("freighter-networkChange", handleStellarNetworkChange);
    return () => {
      window.removeEventListener("freighter-networkChange", handleStellarNetworkChange);
    };
  }, [onNetworkChange]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 cursor-default">
          <span>{truncateAddress(address)}</span>
          {network && (
            <Badge
              variant={network === "mainnet" ? "default" : "secondary"}
              className={
                network === "mainnet"
                  ? "bg-green-500 text-white hover:bg-green-600"
                  : "bg-yellow-400 text-black hover:bg-yellow-500"
              }
            >
              {network === "mainnet" ? "Mainnet" : "Testnet"}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-2 py-1.5">
          <p className="text-xs text-muted-foreground">Connected Address</p>
          <p className="font-mono text-sm break-all">{address}</p>
        </div>
        <DropdownMenuItem onClick={handleCopy} className="cursor-default">
          <Copy className="mr-2 h-4 w-4" />
          Copy Address
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDisconnect} className="cursor-default text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
