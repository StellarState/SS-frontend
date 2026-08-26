"use client";

import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { usePageTitle } from "@/hooks/usePageTitle";
import { RecentlyViewed } from "@/components/marketplace/recently-viewed";

export default function HomePage() {
  usePageTitle("StellarSettle — Invoice Marketplace");
  const { entries } = useRecentlyViewed();

  return (
    <main className="container mx-auto px-4 py-8 space-y-8">
      <h1 className="text-3xl font-bold">StellarSettle</h1>
      <RecentlyViewed entries={entries} />
    </main>
  );
}
