"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePageLoadPerformanceLog } from "@/hooks/usePageLoadPerformanceLog";
import { useStellarWallet } from "@/hooks/useStellarWallet";
import { InvestorPortfolio } from "@/components/dashboard";

export default function InvestorDashboardPage() {
  usePageLoadPerformanceLog("investor_portfolio");
  const router = useRouter();
  const { isConnected, isInitializing } = useStellarWallet();

  useEffect(() => {
    if (!isInitializing && !isConnected) {
      router.replace("/connect-wallet");
    }
  }, [isInitializing, isConnected, router]);

  if (isInitializing || !isConnected) {
    return null;
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Investor Portfolio</h1>
      <InvestorPortfolio />
    </main>
  );
}
