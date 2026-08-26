"use client";

import Link from "next/link";
import { Bell, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStellarWallet } from "@/hooks/useStellarWallet";
import { WalletChip } from "@/components/wallet/WalletChip";
import { useUnreadCount } from "@/hooks/useNotifications";

export function Navbar() {
  const { address, network, isConnected, isConnecting, connect, disconnect, refreshNetwork } =
    useStellarWallet();
  const { data: unreadData } = useUnreadCount();

  const unreadCount = typeof unreadData === "number" ? unreadData : unreadData?.count ?? 0;

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          StellarSettle
        </Link>

        <nav className="flex items-center gap-4">
          <Link href="/marketplace" className="text-sm text-muted-foreground hover:text-foreground">
            Marketplace
          </Link>
          <Link
            href="/investor/notifications"
            className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Notifications"
            data-testid="nav-bell"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span
                data-testid="nav-bell-unread-count"
                className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground"
              >
                {unreadCount}
              </span>
            )}
          </Link>
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
      </div>
    </header>
  );
}

