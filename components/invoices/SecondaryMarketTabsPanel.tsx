"use client";

/**
 * Secondary Market Tabs Panel (#480)
 *
 * Shown on the invoice detail page for funded/active invoices that have
 * secondary-market listings. Contains two tabs:
 *   - Buy Now: the existing immediate-purchase flow (BuyFractionModal triggers)
 *   - Limit Order: the new limit order placement UI
 */

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LimitOrderPanel } from "@/components/invoices/LimitOrderPanel";
import { OfferNegotiationPanel } from "@/components/invoices/OfferNegotiationPanel";
import { useSecondaryListings } from "@/hooks/useSecondaryMarket";
import { BuyFractionModal } from "@/components/marketplace/BuyFractionModal";
import type { ResaleListing } from "@/lib/api";
import type { ListingReference } from "@/lib/analytics/offerNegotiation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function formatAmount(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 4 });
}

interface SecondaryMarketTabsPanelProps {
  invoiceId: string;
  walletAddress: string | null | undefined;
}

type Tab = "buy_now" | "limit_order" | "negotiate";

export function SecondaryMarketTabsPanel({
  invoiceId,
  walletAddress,
}: SecondaryMarketTabsPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("buy_now");
  const [selectedListing, setSelectedListing] = useState<ResaleListing | null>(null);
  const [selectedListingForOffer, setSelectedListingForOffer] = useState<ListingReference | null>(null);
  const [buyModalOpen, setBuyModalOpen] = useState(false);

  const { data, isLoading } = useSecondaryListings({ invoiceId });
  const listings = (data?.listings ?? []).filter(
    (l) => l.status === "active" && l.remaining_quantity > 0
  );

  const activeListingReference: ListingReference | null = selectedListingForOffer ?? (listings.length > 0 ? {
    id: listings[0].id,
    seller_address: listings[0].seller ?? "GBSELLER...",
    price_per_fraction: listings[0].ask_price,
    available_quantity: listings[0].remaining_quantity,
    fair_value_per_fraction: listings[0].ask_price * 0.98,
    invoice_annual_yield: 12.0,
  } : null);

  const tabClass = (tab: Tab) =>
    `pb-2 text-sm font-semibold border-b-2 transition-colors ${
      activeTab === tab
        ? "border-primary text-foreground"
        : "border-transparent text-muted-foreground hover:text-foreground"
    }`;

  return (
    <Card data-testid="secondary-market-panel">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Secondary Market</h2>
          {listings.length > 0 && (
            <Badge variant="secondary" data-testid="secondary-listing-count">
              {listings.length} listing{listings.length !== 1 ? "s" : ""} available
            </Badge>
          )}
        </div>

        {/* Tabs */}
        <div className="mt-3 flex gap-6 border-b">
          <button
            type="button"
            className={tabClass("buy_now")}
            onClick={() => setActiveTab("buy_now")}
            data-testid="tab-buy-now"
          >
            Buy Now
          </button>
          <button
            type="button"
            className={tabClass("limit_order")}
            onClick={() => setActiveTab("limit_order")}
            data-testid="tab-limit-order"
          >
            Limit Order
          </button>
          <button
            type="button"
            className={tabClass("negotiate")}
            onClick={() => setActiveTab("negotiate")}
            data-testid="tab-negotiate"
          >
            Negotiate Offers
          </button>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {activeTab === "buy_now" ? (
          <div className="space-y-3" data-testid="buy-now-tab">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading listings…</p>
            ) : listings.length === 0 ? (
              <p
                className="py-4 text-center text-sm text-muted-foreground"
                data-testid="no-listings"
              >
                No active listings on the secondary market for this invoice.
              </p>
            ) : (
              <ul className="space-y-2" aria-label="Secondary market listings">
                {listings.map((listing) => (
                  <li
                    key={listing.id}
                    className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3"
                    data-testid={`listing-row-${listing.id}`}
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {listing.remaining_quantity.toLocaleString("en-US")} fractions @{" "}
                        {formatAmount(listing.ask_price)} XLM/fraction
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Maturity value: {formatAmount(listing.maturity_value)} XLM ·{" "}
                        {new Date(listing.maturity_date).toLocaleDateString("en-US")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedListingForOffer({
                            id: listing.id,
                            seller_address: listing.seller ?? "GBSELLER...",
                            price_per_fraction: listing.ask_price,
                            available_quantity: listing.remaining_quantity,
                            fair_value_per_fraction: listing.ask_price * 0.98,
                            invoice_annual_yield: 12.0,
                          });
                          setActiveTab("negotiate");
                        }}
                        data-testid={`offer-listing-${listing.id}`}
                      >
                        Make Offer
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setSelectedListing(listing);
                          setBuyModalOpen(true);
                        }}
                        data-testid={`buy-listing-${listing.id}`}
                      >
                        Buy
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : activeTab === "limit_order" ? (
          <LimitOrderPanel invoiceId={invoiceId} walletAddress={walletAddress} />
        ) : (
          <OfferNegotiationPanel
            invoiceId={invoiceId}
            walletAddress={walletAddress}
            activeListing={activeListingReference}
          />
        )}
      </CardContent>

      <BuyFractionModal
        listing={selectedListing}
        open={buyModalOpen}
        onOpenChange={setBuyModalOpen}
        onPurchased={() => {
          setBuyModalOpen(false);
          setSelectedListing(null);
        }}
      />
    </Card>
  );
}
