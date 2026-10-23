"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchIssuerCreditScore } from "@/lib/api";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const colors = {
  C: "bg-red-100 text-red-800", B: "bg-amber-100 text-amber-800",
  A: "bg-slate-100 text-slate-800", AA: "bg-blue-100 text-blue-800",
  AAA: "bg-yellow-100 text-yellow-900",
} as const;

export function IssuerCreditTierBadge({ wallet }: { wallet: string }) {
  const { data } = useQuery({ queryKey: ["issuer-credit-score", wallet], queryFn: () => fetchIssuerCreditScore(wallet), staleTime: 60_000 });
  if (!data) return null;
  return <TooltipProvider><Tooltip><TooltipTrigger asChild><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${colors[data.tier]}`} aria-label={`Issuer credit tier ${data.tier}, score ${data.score}`} data-testid="issuer-credit-tier">{data.tier} · {data.score}</span></TooltipTrigger><TooltipContent><p className="font-medium">Credit score factors</p>{Object.entries(data.factors).map(([name, score]) => <p key={name}>{name.replaceAll("_", " ")}: {score}</p>)}</TooltipContent></Tooltip></TooltipProvider>;
}
