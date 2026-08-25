"use client";

import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { RecentlyViewed } from "@/components/marketplace/recently-viewed";
import { TopInvestorsLeaderboard } from "@/components/marketplace/TopInvestorsLeaderboard";

export default function HomePage() {
  const { entries } = useRecentlyViewed();

  return (
    <main className="container mx-auto px-4 py-8 space-y-8">
      <h1 className="text-3xl font-bold">StellarSettle</h1>
      <TopInvestorsLeaderboard />
      <RecentlyViewed entries={entries} />
    </main>
  );
}

