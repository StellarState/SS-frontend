"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { fetchInvoiceDetail } from "@/lib/api";

interface FundingProgressTrackerProps {
  invoiceId: string;
  target: number;
  raised?: number | null;
  investorCount?: number;
  deadline?: string | null;
}

function formatAmount(amount: number) {
  return amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function Countdown({ deadline }: { deadline: string }) {
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    function tick() {
      const diff = new Date(deadline).getTime() - Date.now();
      if (diff <= 0) { setRemaining("Expired"); return; }
      const d = Math.floor(diff / 86_400_000);
      const h = Math.floor((diff % 86_400_000) / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      setRemaining(d > 0 ? `${d}d ${h}h left` : h > 0 ? `${h}h ${m}m left` : `${m}m left`);
    }
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [deadline]);
  const expired = remaining === "Expired";
  return <span className={`text-sm font-medium ${expired ? "text-red-500" : "text-muted-foreground"}`}>{remaining || "—"}</span>;
}

export function FundingProgressTracker({ invoiceId, target, raised: raisedProp, investorCount: countProp, deadline }: FundingProgressTrackerProps) {
  const { data } = useQuery({ queryKey: ["invoice-funding", invoiceId], queryFn: () => fetchInvoiceDetail(invoiceId), refetchInterval: 30_000, staleTime: 15_000 });
  const raised = data?.raised ?? raisedProp ?? 0;
  const investorCount = data?.investorCount ?? countProp ?? 0;
  const isFullyFunded = target > 0 && raised >= target;
  const percentage = target > 0 ? Math.min((raised / target) * 100, 100) : 0;
  return (
    <div className="space-y-3" data-testid="funding-progress-tracker">
      <div>
        <div className="mb-2 flex justify-between text-sm"><span>Funding Progress</span><span className="font-semibold">{percentage.toFixed(1)}%</span></div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
          <div role="progressbar" aria-valuenow={Math.round(percentage)} aria-valuemin={0} aria-valuemax={100} data-testid="funding-progress-bar" className={`h-full rounded-full transition-all duration-1000 ease-out ${isFullyFunded ? "bg-green-500" : "bg-primary"}`} style={{ width: `${percentage}%` }} />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{formatAmount(raised)} XLM of {formatAmount(target)} XLM</p>
        <div className="flex items-center gap-3">
          {isFullyFunded && <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">Fully Funded</span>}
          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground" data-testid="investor-count">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            {investorCount} {investorCount === 1 ? "investor" : "investors"}
          </span>
          {deadline && <Countdown deadline={deadline} />}
        </div>
      </div>
      {deadline && new Date(deadline).getTime() < Date.now() && !isFullyFunded && (
        <div className="rounded-md bg-red-50 p-2 text-center text-sm font-medium text-red-700">Funding deadline has expired</div>
      )}
    </div>
  );
}
