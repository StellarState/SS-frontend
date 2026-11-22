"use client";

import { useState } from "react";
import Link from "next/link";
import { Wallet, Bookmark, Activity, Receipt, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStellarWallet } from "@/hooks/useStellarWallet";
import { WalletChip } from "@/components/wallet/WalletChip";
import { UsdcBalanceChip } from "@/components/wallet/UsdcBalanceChip";
import { ConnectWalletModal } from "@/components/wallet/ConnectWalletModal";
import { CurrencyToggle } from "./CurrencyToggle";
import { PRIMARY_NAV_ID } from "./SkipLinks";
import { NetworkBadge } from "@/components/network/NetworkBadge";
import { WhatsNewButton } from "@/components/changelog/WhatsNewButton";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useSandboxMode } from "@/hooks/useSandboxMode";
import { cn } from "@/lib/utils";

export function Navbar() {
  const {
    address,
    network,
    isConnected,
    isConnecting,
    disconnect,
    refreshNetwork,
  } = useStellarWallet();
  const { count, isLoading } = useWatchlist();
  const { isSandbox, toggleSandbox } = useSandboxMode();
  const [connectOpen, setConnectOpen] = useState(false);

  return (
    <header
      aria-label="Site header"
      className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          StellarSettle
        </Link>

        <nav
          id={PRIMARY_NAV_ID}
          aria-label="Main navigation"
          className="hidden md:flex items-center gap-4"
        >
          <Link
            href="/marketplace"
            data-tour="marketplace"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Marketplace
          </Link>
          {isConnected && (
            <>
              <Link
                href="/investor/portfolio"
                data-tour="portfolio"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Portfolio
              </Link>
              <Link
                href="/marketplace/resale"
                data-tour="secondary-market"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Secondary market
              </Link>
              <Link
                href="/activity"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <Activity className="h-4 w-4" />
                Activity
              </Link>
              <Link
                href="/transactions"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <Receipt className="h-4 w-4" />
                Transactions
              </Link>
              <Link
                href="/watchlist"
                className="relative flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <Bookmark className="h-4 w-4" />
                Watchlist
                {(count > 0 || isLoading) && (
                  <Badge
                    variant="default"
                    className={cn(
                      "ml-1 h-5 min-w-5 text-xs",
                      isLoading ? "bg-muted animate-pulse" : "bg-primary",
                    )}
                  >
                    {isLoading ? "..." : count}
                  </Badge>
                )}
              </Link>
            </>
          )}
          {/* #443 — app-wide Stellar network badge */}
          <NetworkBadge />
          {/* #611 — what's new changelog with unread indicator */}
          <WhatsNewButton />
          {/* Language switcher for i18n */}
          <LanguageSwitcher />
          {/* #437 — USD / XLM display toggle */}
          <CurrencyToggle />
          {/* #640 — sandbox practice mode toggle */}
          <Button
            variant={isSandbox ? "default" : "outline"}
            size="sm"
            onClick={toggleSandbox}
            className={cn(
              "h-8 gap-1.5 text-xs",
              isSandbox && "bg-yellow-400 text-yellow-900 hover:bg-yellow-500 border-yellow-400",
            )}
            data-testid="sandbox-toggle"
            title={isSandbox ? "Exit Practice Mode" : "Enter Practice Mode"}
          >
            <FlaskConical className="size-3.5" />
            {isSandbox ? "Practice" : "Practice Mode"}
          </Button>
          {isConnected ? (
            <div className="flex items-center gap-2">
              {/* USDC balance (#402) sits next to the connected address. */}
              <UsdcBalanceChip address={address!} network={network} />
              <WalletChip
                address={address!}
                network={network}
                onDisconnect={() => disconnect()}
                onNetworkChange={refreshNetwork}
              />
            </div>
          ) : (
            <Button
              onClick={() => setConnectOpen(true)}
              disabled={isConnecting}
              className="cursor-default"
              data-testid="connect-wallet-button"
            >
              <Wallet className="mr-2 h-4 w-4" />
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </Button>
          )}
        </nav>
      </div>

      <ConnectWalletModal open={connectOpen} onOpenChange={setConnectOpen} />
    </header>
  );
}
