"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ReservePlannerView } from "@/components/issuers/ReservePlannerView";
import { useStellarWallet } from "@/hooks/useStellarWallet";
import { usePageTitle } from "@/hooks/usePageTitle";

/** Issuer liquidity reserve target planner route for issue #694. */
export default function IssuerReservesPage() {
  usePageTitle("Reserve target planner");
  const router = useRouter();
  const { isConnected, isInitializing } = useStellarWallet();

  useEffect(() => {
    if (!isInitializing && !isConnected) {
      router.replace("/connect-wallet");
    }
  }, [isInitializing, isConnected, router]);

  if (isInitializing || !isConnected) return null;

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <ReservePlannerView />
    </main>
  );
}
