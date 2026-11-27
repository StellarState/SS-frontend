"use client";

import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useWallet } from "@/context/WalletContext";
import { useUsdcBalance } from "@/hooks/useUsdcBalance";
import { formatUsdc } from "@/lib/format";
import {
  bpsToPercent,
  canCoverFee,
  computeListingFee,
  createListing,
  fetchListingFeeConfig,
} from "@/lib/listingFee";
import { validateListingPrice, DEFAULT_PRICE_CEILING, DEFAULT_PRICE_FLOOR } from "@/lib/myListings";
import { MY_LISTINGS_QUERY_KEY } from "@/components/marketplace/MyListings";

interface CreateListingModalProps {
  invoiceId: string;
  invoiceName: string;
  /** Fractions the seller holds and has not already listed. */
  availableQuantity: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialQuantity?: number;
  initialPrice?: number;
  quoteExpiresAt?: number;
}

export function CreateListingModal({
  invoiceId,
  invoiceName,
  availableQuantity,
  open,
  onOpenChange,
  initialQuantity,
  initialPrice,
  quoteExpiresAt,
}: CreateListingModalProps) {
  const queryClient = useQueryClient();
  const { address, network } = useWallet();
  const { balance } = useUsdcBalance(address, network);
  const [quantityRaw, setQuantityRaw] = useState("");
  const [priceRaw, setPriceRaw] = useState("");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!open) return;
    setQuantityRaw(initialQuantity === undefined ? "" : String(initialQuantity));
    setPriceRaw(initialPrice === undefined ? "" : String(initialPrice));
    setNow(Date.now());
  }, [initialPrice, initialQuantity, open]);

  useEffect(() => {
    if (!open || quoteExpiresAt === undefined) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [open, quoteExpiresAt]);

  const feeConfig = useQuery({
    queryKey: ["secondary-market", "listing-fee"],
    queryFn: ({ signal }) => fetchListingFeeConfig(signal),
    enabled: open,
  });

  const quantity = Number(quantityRaw);
  const price = Number(priceRaw);

  const quantityError =
    quantityRaw === ""
      ? null
      : !Number.isInteger(quantity) || quantity <= 0
        ? "Enter a whole number of fractions."
        : quantity > availableQuantity
          ? `You can list at most ${availableQuantity}.`
          : null;
  const priceError =
    priceRaw === "" ? null : validateListingPrice(price, DEFAULT_PRICE_FLOOR, DEFAULT_PRICE_CEILING);

  const feeBps = feeConfig.data?.fee_bps ?? 0;
  const preview = computeListingFee(quantity, price, feeBps);
  const insufficientBalance = !canCoverFee(balance, preview.fee);
  const quoteExpired = quoteExpiresAt !== undefined && now >= quoteExpiresAt;

  const mutation = useMutation({
    mutationFn: () => createListing({ invoiceId, quantity, askPrice: price }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: MY_LISTINGS_QUERY_KEY });
      toast.success(
        "Listing created",
        result.transaction_hash ? { description: result.transaction_hash } : undefined
      );
      setQuantityRaw("");
      setPriceRaw("");
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to create listing");
    },
  });

  const canSubmit =
    quantityRaw !== "" &&
    priceRaw !== "" &&
    !quantityError &&
    !priceError &&
    Boolean(feeConfig.data) &&
    !insufficientBalance &&
    !quoteExpired &&
    !mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="create-listing-modal">
        <DialogHeader>
          <DialogTitle>List for sale</DialogTitle>
          <DialogDescription>{invoiceName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="listing-quantity">Fractions to sell</Label>
            <Input
              id="listing-quantity"
              type="number"
              inputMode="numeric"
              min={1}
              max={availableQuantity}
              value={quantityRaw}
              onChange={(e) => setQuantityRaw(e.target.value)}
              readOnly={quoteExpiresAt !== undefined}
              data-testid="listing-quantity-input"
            />
            {quantityError ? (
              <p className="text-xs text-destructive" role="alert">
                {quantityError}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">{availableQuantity} available</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="listing-price">Ask price per fraction (XLM)</Label>
            <Input
              id="listing-price"
              type="number"
              inputMode="decimal"
              min={0}
              value={priceRaw}
              onChange={(e) => setPriceRaw(e.target.value)}
              readOnly={quoteExpiresAt !== undefined}
              data-testid="listing-price-input"
            />
            {priceError && (
              <p className="text-xs text-destructive" role="alert">
                {priceError}
              </p>
            )}
          </div>

          {quoteExpiresAt !== undefined && (
            <p
              className={`text-sm ${quoteExpired ? "text-destructive" : "text-muted-foreground"}`}
              role={quoteExpired ? "alert" : "status"}
              data-testid="listing-quote-expiry"
            >
              {quoteExpired
                ? "The exit quote expired. Close this dialog and create a new quote."
                : `Exit quote expires at ${new Date(quoteExpiresAt).toLocaleTimeString()}.`}
            </p>
          )}

          <div className="space-y-2 rounded-md border p-3 text-sm" data-testid="listing-fee-preview">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-muted-foreground">
                Listing fee
                {feeConfig.data && ` (${bpsToPercent(feeConfig.data.fee_bps)})`}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="About the listing fee"
                        data-testid="listing-fee-tooltip-trigger"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent data-testid="listing-fee-tooltip">
                      {feeConfig.data
                        ? `A listing fee of ${bpsToPercent(feeConfig.data.fee_bps)} of the listing value is charged to your wallet balance when you list, and sent to the protocol treasury.`
                        : "The listing fee is charged to your wallet when you list and sent to the protocol treasury."}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </span>
              <span className="font-medium tabular-nums" data-testid="listing-fee-amount">
                {feeConfig.isLoading ? "Loading…" : formatUsdc(preview.fee)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Charged from</span>
              <span data-testid="listing-fee-source">
                Wallet balance {balance === null ? "" : `(${formatUsdc(balance)})`}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Net proceeds after fee</span>
              <span className="font-medium tabular-nums" data-testid="listing-net-proceeds">
                {preview.netProceeds.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                XLM
              </span>
            </div>
            {feeConfig.isError && (
              <p className="text-xs text-destructive" role="alert" data-testid="listing-fee-error">
                Could not load the listing fee. Try again in a moment.
              </p>
            )}
            {insufficientBalance && (
              <p
                className="text-xs text-destructive"
                role="alert"
                data-testid="listing-insufficient-balance"
              >
                Your wallet balance cannot cover the {formatUsdc(preview.fee)} listing fee. Add
                funds to continue.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit}
            data-testid="listing-confirm"
          >
            {mutation.isPending ? "Listing..." : "Confirm listing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
