"use client";

import { useParams } from "next/navigation";
import { AuctionDetailView } from "@/components/marketplace/AuctionDetailView";

export default function AuctionDetailPage() {
  const params = useParams<{ id: string }>();
  const auctionId = Array.isArray(params.id) ? params.id[0] : params.id;

  return (
    <main className="container mx-auto px-4 py-8">
      <AuctionDetailView auctionId={auctionId} />
    </main>
  );
}
