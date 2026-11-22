"use client";
/**
 * Collateral warning banner for the issuer dashboard (#644).
 *
 * Queries the collateral summary across all issuer invoices and shows a banner
 * when any invoice is below the warning threshold.
 */
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export const COLLATERAL_SUMMARY_QUERY_KEY = ["issuer-collateral-summary"] as const;

interface CollateralSummary {
  critical_count: number;
  warning_count: number;
  critical_invoice_ids?: string[];
  warning_invoice_ids?: string[];
}

async function fetchCollateralSummary(): Promise<CollateralSummary> {
  const res = await fetch(`${API_BASE}/issuer/collateral-summary`);
  if (!res.ok) throw new Error("Failed to fetch collateral summary");
  return res.json();
}

export function CollateralWarningBanner() {
  const { data, isError } = useQuery<CollateralSummary>({
    queryKey: COLLATERAL_SUMMARY_QUERY_KEY,
    queryFn: fetchCollateralSummary,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  if (isError || !data) return null;

  const total = (data.critical_count ?? 0) + (data.warning_count ?? 0);
  if (total === 0) return null;

  const isCritical = (data.critical_count ?? 0) > 0;

  return (
    <div
      role="alert"
      data-testid="collateral-warning-banner"
      className={`flex items-start gap-3 rounded-md border px-4 py-3 text-sm ${
        isCritical
          ? "border-red-300 bg-red-50 text-red-800"
          : "border-yellow-300 bg-yellow-50 text-yellow-800"
      }`}
    >
      <AlertTriangle className="size-4 mt-0.5 shrink-0" aria-hidden="true" />
      <div className="flex-1 space-y-1">
        <p className="font-medium">
          {isCritical ? "Critical collateral shortfall" : "Collateral below threshold"}
        </p>
        <p className="text-xs opacity-80">
          {total} invoice{total !== 1 ? "s" : ""}{" "}
          {isCritical && data.critical_count > 0
            ? `${data.critical_count} critical`
            : ""}{" "}
          {data.warning_count > 0 ? `${data.warning_count} at warning level` : ""}{" "}
          — top up to avoid funding disruption.
        </p>
      </div>
      <Button asChild size="sm" variant="outline" className="shrink-0">
        <Link href="/seller">View invoices</Link>
      </Button>
    </div>
  );
}
