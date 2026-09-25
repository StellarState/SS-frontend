"use client";

import { useState } from "react";
import { ResaleListingCard, ListSharesForm, type ResaleListingData } from "./ResaleListing";
import { useCurrency } from "@/hooks/useCurrency";

interface ResaleMarketplaceTabProps {
  invoiceId: string;
  invoiceTitle: string;
  myShares?: number;
  listings: ResaleListingData[];
  onBuy: (listingId: string) => void;
  onCancel: (listingId: string) => void;
  onList: (data: { invoiceId: string; shares: number; pricePerShare: number }) => void;
  currentAddress?: string;
}

export function ResaleMarketplaceTab({
  invoiceId,
  invoiceTitle,
  myShares = 0,
  listings,
  onBuy,
  onCancel,
  onList,
  currentAddress,
}: ResaleMarketplaceTabProps) {
  const [showListForm, setShowListForm] = useState(false);
  const activeListings = listings.filter((l) => l.status === "active");
  const myActiveListings = activeListings.filter((l) => l.seller === currentAddress);

  return (
    <div className="space-y-6" data-testid="resale-tab">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Secondary Market</h3>
        {myShares > 0 && (
          <button
            type="button"
            onClick={() => setShowListForm(!showListForm)}
            className="text-sm text-primary hover:underline"
            aria-expanded={showListForm}
            aria-controls="list-shares-form"
            data-testid="toggle-list-form"
          >
            {showListForm ? "Cancel" : "List My Shares"}
          </button>
        )}
      </div>

      {showListForm && myShares > 0 && (
        <ListSharesForm
          invoiceId={invoiceId}
          maxShares={myShares}
          onSubmit={(data) => {
            onList(data);
            setShowListForm(false);
          }}
        />
      )}

      {myActiveListings.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">My Listings</h4>
          <div className="space-y-3">
            {myActiveListings.map((listing) => (
              <ResaleListingCard
                key={listing.id}
                listing={listing}
                onCancel={onCancel}
                currentAddress={currentAddress}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-2">
          Available Listings ({activeListings.length})
        </h4>
        {activeListings.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No resale listings available yet.
          </p>
        ) : (
          <div className="space-y-3">
            {activeListings
              .filter((l) => l.seller !== currentAddress)
              .map((listing) => (
                <ResaleListingCard
                  key={listing.id}
                  listing={listing}
                  onBuy={onBuy}
                  currentAddress={currentAddress}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
