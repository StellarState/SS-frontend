"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { Invoice } from "@/lib/api";

function remaining(until?: string | null, now = Date.now()) {
  if (!until) return null;
  const seconds = Math.max(0, Math.floor((new Date(until).getTime() - now) / 1000));
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export function InvoiceGreylistStatus({ greylist, compact = false }: { greylist?: Invoice["greylist"]; compact?: boolean }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(timer); }, []);
  if (!greylist || (greylist.clears_at && new Date(greylist.clears_at).getTime() <= now)) return null;
  if (compact) return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900" data-testid="greylist-chip">Compliance hold</span>;
  return <div role="status" className="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950" data-testid="greylist-banner"><AlertTriangle className="mt-0.5 size-5 shrink-0"/><div><p className="font-semibold">Compliance hold — new investments are paused</p>{greylist.reason && <p className="mt-1 text-sm">{greylist.reason}</p>}{greylist.clears_at && <p className="mt-1 text-sm">Auto-clear in {remaining(greylist.clears_at, now)}</p>}<p className="mt-1 text-xs">Existing holders can still exit their positions.</p></div></div>;
}
