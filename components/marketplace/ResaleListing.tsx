"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/hooks/useCurrency";

export interface ResaleListingData {
  id: string;
  invoiceId: string;
  invoiceTitle: string;
  seller: string;
  sharesOffered: number;
  pricePerShare: number;
  totalValue: number;
  listedAt: string;
  status: "active" | "sold" | "cancelled";
}

interface ResaleListingCardProps {
  listing: ResaleListingData;
  onBuy?: (listingId: string) => void;
  onCancel?: (listingId: string) => void;
  currentAddress?: string;
}

export function ResaleListingCard({ listing, onBuy, onCancel, currentAddress }: ResaleListingCardProps) {
  const { format } = useCurrency();
  const isSeller = currentAddress === listing.seller;
  const isActive = listing.status === "active";

  return (
    <Card data-testid={`resale-listing-${listing.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">{listing.invoiceTitle}</CardTitle>
          <Badge variant={isActive ? "default" : "secondary"}>
            {listing.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Shares</span>
            <p className="font-medium">{listing.sharesOffered}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Price/Share</span>
            <p className="font-medium">{format(listing.pricePerShare)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Total</span>
            <p className="font-medium">{format(listing.totalValue)}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Seller: {listing.seller.slice(0, 8)}...{listing.seller.slice(-4)}
        </p>
        <div className="mt-3 flex gap-2">
          {isActive && !isSeller && onBuy && (
            <Button size="sm" onClick={() => onBuy(listing.id)} data-testid="buy-resale-btn">
              Buy Shares
            </Button>
          )}
          {isSeller && isActive && onCancel && (
            <Button size="sm" variant="destructive" onClick={() => onCancel(listing.id)} data-testid="cancel-listing-btn">
              Cancel Listing
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface ListSharesFormProps {
  invoiceId: string;
  maxShares: number;
  onSubmit: (data: { invoiceId: string; shares: number; pricePerShare: number }) => void;
}

export function ListSharesForm({ invoiceId, maxShares, onSubmit }: ListSharesFormProps) {
  const [shares, setShares] = useState(1);
  const [pricePerShare, setPricePerShare] = useState("");
  const { format } = useCurrency();

  const price = parseFloat(pricePerShare) || 0;
  const total = shares * price;
  const isValid = shares > 0 && shares <= maxShares && price > 0;

  return (
    <Card data-testid="list-shares-form">
      <CardHeader>
        <CardTitle className="text-sm">List Shares for Resale</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground">Shares to List (max {maxShares})</label>
          <Input
            type="number"
            min={1}
            max={maxShares}
            value={shares}
            onChange={(e) => setShares(Number(e.target.value))}
            data-testid="shares-input"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Price per Share (XLM)</label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={pricePerShare}
            onChange={(e) => setPricePerShare(e.target.value)}
            placeholder="0.00"
            data-testid="price-input"
          />
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total Value</span>
          <span className="font-medium">{format(total)}</span>
        </div>
        <Button
          disabled={!isValid}
          onClick={() => onSubmit({ invoiceId, shares, pricePerShare: price })}
          className="w-full"
          data-testid="submit-listing-btn"
        >
          List for Sale
        </Button>
      </CardContent>
    </Card>
  );
}
