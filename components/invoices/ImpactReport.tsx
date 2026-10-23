"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { fetchIpfsText } from "@/lib/ipfs";
import type { Invoice } from "@/lib/api";

export function ImpactReport({ report }: { report?: Invoice["impact_report"] }) {
  const [content, setContent] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    if (report?.metrics_hash) fetchIpfsText(report.metrics_hash).then((value) => { if (active) setContent(value); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [report?.metrics_hash]);
  if (!report) return null;
  let formatted: string;
  try { formatted = JSON.stringify(JSON.parse(content ?? ""), null, 2); } catch { formatted = content ?? ""; }
  return <section className="space-y-3 rounded-lg border p-4" aria-label="Impact report" data-testid="impact-report"><div className="flex items-center gap-2"><h2 className="text-lg font-semibold">Impact report</h2><Badge variant="secondary">{report.type}</Badge>{report.verified && <Badge>Admin verified</Badge>}</div>{failed ? <p className="text-sm text-muted-foreground">The report could not be loaded from IPFS.</p> : content === null ? <p className="text-sm text-muted-foreground">Loading report…</p> : <pre className="whitespace-pre-wrap break-words text-sm">{formatted}</pre>}</section>;
}
