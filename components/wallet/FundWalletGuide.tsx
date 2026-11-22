"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Check, Circle, ExternalLink, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/context/WalletContext";
import { useWalletBalances } from "@/hooks/useWalletBalances";
import { requiredReserveXlm } from "@/lib/stellar/balances";
import { TopUpDialog } from "./TopUpDialog";
import { TrustlineStep } from "./TrustlineStep";

/** On-ramp options shown with their supported regions (#648). */
export const ON_RAMPS = [
  {
    name: "Coinbase",
    regions: "US, EU, UK and others",
    url: "https://www.coinbase.com/buy/xlm",
    use: "Buy XLM with a card or bank transfer",
  },
  {
    name: "Kraken",
    regions: "US, EU, UK and others",
    url: "https://www.kraken.com/prices/xlm",
    use: "Buy XLM, then withdraw to your Stellar address",
  },
  {
    name: "StellarTerm",
    regions: "Worldwide (non-custodial)",
    url: "https://stellarterm.com/",
    use: "Trade XLM for the investment asset on the DEX",
  },
] as const;

interface StepProps {
  number: number;
  title: string;
  complete: boolean;
  testId: string;
  children: ReactNode;
}

function Step({ number, title, complete, testId, children }: StepProps) {
  return (
    <li data-testid={testId} data-complete={complete} className="rounded-lg border p-4">
      <div className="mb-2 flex items-center gap-2">
        <span
          aria-hidden="true"
          className={
            complete
              ? "flex size-6 items-center justify-center rounded-full bg-green-700 text-white"
              : "flex size-6 items-center justify-center rounded-full border text-muted-foreground"
          }
        >
          {complete ? <Check className="size-4" /> : <Circle className="size-3" />}
        </span>
        <h2 className="font-semibold">
          {number}. {title}
        </h2>
        {complete && <span className="text-xs text-green-800 dark:text-green-300">Complete</span>}
      </div>
      <div className="pl-8 text-sm text-muted-foreground">{children}</div>
    </li>
  );
}

/** #648: balance-aware wallet funding guide with on-ramps and a reserve notice. */
export function FundWalletGuide() {
  const { address, isConnected, wallet, connect } = useWallet();
  const { balances, isLoading, refresh } = useWalletBalances(address);

  const hasTrustline = balances?.hasTrustline ?? false;
  const xlm = balances?.xlm ?? 0;
  const asset = balances?.asset ?? 0;
  const minimumXlm = requiredReserveXlm(hasTrustline);
  const hasXlm = xlm >= minimumXlm;
  const hasAsset = asset > 0;

  return (
    <main className="container mx-auto max-w-3xl space-y-6 px-4 py-8" data-testid="fund-wallet-guide">
      <div>
        <h1 className="text-2xl font-semibold">Fund your wallet</h1>
        <p className="text-muted-foreground">
          Follow these steps to get XLM, add the investment trustline and buy the asset.
        </p>
        <Link href="/dashboard" className="text-sm underline">
          Back to dashboard
        </Link>
      </div>

      {!isConnected && (
        <div className="rounded-lg border bg-muted p-4" data-testid="connect-prompt">
          <p className="mb-2 flex items-center gap-2 text-sm">
            <Wallet className="size-4" /> Connect a wallet to see your funding progress.
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => connect("freighter")}>Connect Freighter</Button>
            <Button size="sm" variant="outline" onClick={() => connect("albedo")}>
              Connect Albedo
            </Button>
          </div>
        </div>
      )}

      <div role="status" data-testid="balance-summary" className="rounded-lg border p-4 text-sm">
        <p>XLM balance: <span data-testid="xlm-balance">{isLoading ? "…" : xlm.toFixed(4)}</span></p>
        <p>Investment asset: <span data-testid="asset-balance">{asset.toFixed(2)}</span></p>
        <p>Trustline: <span data-testid="trustline-status">{hasTrustline ? "Active" : "Not added"}</span></p>
      </div>

      <div
        role="note"
        data-testid="reserve-notice"
        className="rounded-lg border border-blue-600 bg-blue-50 p-3 text-sm text-blue-950 dark:bg-blue-950 dark:text-blue-50"
      >
        Stellar requires a base reserve for every ledger entry. Your account needs{" "}
        <strong>{minimumXlm} XLM</strong>
        {hasTrustline ? " (account + investment trustline)" : " (account)"}, plus a small amount for
        network fees. Keep a little extra so transactions succeed.
      </div>

      <ol className="space-y-3">
        <Step number={1} title="Get XLM" complete={hasXlm} testId="step-xlm">
          <p>
            Send XLM to your wallet from an exchange or an on-ramp below. Your address is{" "}
            <code className="font-mono">{address ?? "not connected"}</code>.
          </p>
          {address && (
            <TopUpDialog
              address={address}
              balance={xlm}
              requiredAmount={minimumXlm}
              trigger={<Button size="sm" variant="outline" data-testid="fund-address">Show address</Button>}
            />
          )}
        </Step>

        <Step number={2} title="Add the trustline" complete={hasTrustline} testId="step-trustline">
          <TrustlineStep hasTrustline={hasTrustline} onSuccess={() => void refresh()} />
        </Step>

        <Step number={3} title="Acquire the investment asset" complete={hasAsset} testId="step-asset">
          <p>
            Once the trustline is active, trade XLM for the asset on a Stellar DEX or receive it
            from another wallet.
          </p>
        </Step>
      </ol>

      <section data-testid="on-ramps" className="space-y-2">
        <h2 className="text-lg font-semibold">On-ramp options</h2>
        {ON_RAMPS.map((ramp) => (
          <div key={ramp.name} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
            <div>
              <p className="font-medium">{ramp.name}</p>
              <p className="text-muted-foreground">{ramp.use}</p>
              <p className="text-xs text-muted-foreground">Regions: {ramp.regions}</p>
            </div>
            <a
              href={ramp.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary underline"
            >
              Visit {ramp.name} <ExternalLink className="size-3" />
            </a>
          </div>
        ))}
      </section>

      <p className="text-xs text-muted-foreground">
        Wallet connected with {wallet ?? "no wallet"}. Balances refresh every 60 seconds.
      </p>
    </main>
  );
}
