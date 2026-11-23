"use client";

import { useQuery } from "@tanstack/react-query";

interface FeeBreakdown {
  type: string;
  amount: number;
  percentage: number;
}

interface RevenueStats {
  totalRevenue: number;
  takeRate: number;
  avgInvoiceFee: number;
  invoiceCount: number;
  volumeCount: number;
  feesByType: FeeBreakdown[];
  topIssuers: Array<{
    name: string;
    fees: number;
  }>;
  topInvestors: Array<{
    name: string;
    fees: number;
  }>;
  previousPeriodRevenue: number;
  changePercentage: number;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

async function fetchRevenueStats(range: DateRange): Promise<RevenueStats> {
  const params = new URLSearchParams({
    startDate: range.startDate.toISOString(),
    endDate: range.endDate.toISOString(),
  });

  const res = await fetch(`/api/admin/revenue?${params}`);
  if (!res.ok) throw new Error("Failed to fetch revenue stats");
  return res.json();
}

export function useRevenueStats(range: DateRange) {
  return useQuery({
    queryKey: ["revenue-stats", range.startDate.getTime(), range.endDate.getTime()],
    queryFn: () => fetchRevenueStats(range),
    refetchInterval: 60000,
    placeholderData: (previous) => previous,
  });
}
