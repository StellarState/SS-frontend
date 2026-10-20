"use client";

import { useParams } from "next/navigation";
import { AuctionSettlementView } from "@/components/marketplace/AuctionSettlementView";

export default function AuctionSettlementPage() {
  const params = useParams<{ id: string }>();
  const auctionId = Array.isArray(params.id) ? params.id[0] : params.id;

  return (
    <main className="container mx-auto px-4 py-8">
      <AuctionSettlementView auctionId={auctionId} />
    </main>
  );
}
