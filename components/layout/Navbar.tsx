"use client";

import Link from "next/link";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStellarWallet } from "@/hooks/useStellarWallet";
import { WalletChip } from "@/components/wallet/WalletChip";
import { NotificationCenter } from "@/components/layout/NotificationCenter";
import { CurrencyToggle } from "@/components/layout/CurrencyToggle";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export function Navbar() {
  const { address, network, isConnected, isConnecting, connect, disconnect, refreshNetwork } =
    useStellarWallet();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          StellarSettle
        </Link>

        <nav className="hidden md:flex items-center gap-4">
          <Link href="/marketplace" className="text-sm text-muted-foreground hover:text-foreground">
            Marketplace
          </Link>
          <Link href="/profile" className="text-sm text-muted-foreground hover:text-foreground">
            Profile
          </Link>
          <ThemeToggle />
          <CurrencyToggle />

          {/* Notification centre (issue #283): bell + dropdown panel with
              read/unread state management. */}
          <NotificationCenter />

          {isConnected ? (
            <WalletChip
              address={address!}
              network={network}
              onDisconnect={disconnect}
              onNetworkChange={refreshNetwork}
            />
          ) : (
            <Button onClick={connect} disabled={isConnecting} className="cursor-default">
              <Wallet className="mr-2 h-4 w-4" />
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </Button>
          )}
        </nav>

        {/* The nav above is hidden below the `md` breakpoint, so a phone would
            otherwise have no way to override the system theme. */}
        <div className="md:hidden">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

