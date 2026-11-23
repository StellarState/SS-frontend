"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ReserveTargetPlanner } from "@/components/issuers/ReserveTargetPlanner";
import { useStellarWallet } from "@/hooks/useStellarWallet";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function IssuerReservePlannerPage() {
  usePageTitle("Issuer Reserve Planner");
  const router = useRouter();
  const { isConnected, isInitializing } = useStellarWallet();

  useEffect(() => {
    if (!isInitializing && !isConnected) {
      router.replace("/marketplace");
    }
  }, [isInitializing, isConnected, router]);

  return (
    <main className="container mx-auto max-w-6xl px-4 py-8">
      <ReserveTargetPlanner />
    </main>
  );
}
