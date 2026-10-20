"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TxHash } from "@/components/ui/tx-hash";
import { useWallet } from "@/context/WalletContext";
import { usePlaceBidMutation } from "@/hooks/useAuction";
import type { Auction } from "@/lib/api";
import { formatBidPrice, getMinimumBid } from "@/lib/auction";

/**
 * Place Bid form. The current highest bid sets the minimum a new bid may
 * carry, so a bid can never undercut the standing price by accident.
 */
export function PlaceBidForm({ auction }: { auction: Auction }) {
  const { address, isConnected } = useWallet();
  const mutation = usePlaceBidMutation(auction.id);
  const minimumBid = getMinimumBid(auction);

  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const parsed = Number(amount);
  const isValid =
    amount !== "" && Number.isFinite(parsed) && parsed > 0 && parsed >= minimumBid;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValid || !address) {
      setError(
        `Enter a bid of at least ${formatBidPrice(minimumBid)} per fraction.`
      );
      return;
    }
    setError(null);
    try {
      const result = await mutation.mutateAsync({
        amount: parsed,
        wallet: address,
      });
      setTxHash(result?.transaction_hash ?? null);
      setAmount("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place bid");
    }
  };

  if (!isConnected) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="auction-bid-connect">
        Connect a wallet to place a bid.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" data-testid="place-bid-form">
      <div className="space-y-2">
        <Label htmlFor="bid-amount">Your bid (XLM per fraction)</Label>
        <Input
          id="bid-amount"
          type="number"
          inputMode="decimal"
          step="0.01"
          min={minimumBid}
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setError(null);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby="bid-amount-hint"
          data-testid="bid-amount-input"
        />
        <p id="bid-amount-hint" className="text-xs text-muted-foreground">
          Minimum bid:{" "}
          <span className="font-medium text-foreground tabular-nums" data-testid="bid-minimum">
            {formatBidPrice(minimumBid)}
          </span>
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert" data-testid="bid-error">
          {error}
        </p>
      )}

      <Button type="submit" disabled={!isValid || mutation.isPending} data-testid="place-bid-btn">
        {mutation.isPending && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
        )}
        Place Bid
      </Button>

      {txHash && (
        <div
          className="space-y-2 rounded-lg border border-green-500/40 bg-green-500/5 p-3"
          data-testid="place-bid-success"
        >
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            Bid submitted
          </p>
          <TxHash hash={txHash} className="text-xs" testId="place-bid-tx-hash" />
        </div>
      )}
    </form>
  );
}
