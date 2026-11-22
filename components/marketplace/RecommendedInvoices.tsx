"use client";
/**
 * Recommended invoices carousel (#647).
 *
 * Fetches personalised recommendations based on investor history with a
 * trending fallback. Dismissed card IDs are persisted in localStorage so
 * the section shrinks as users dismiss cards. The section is hidden entirely
 * when all cards are dismissed or on error with no fallback data.
 */
import { useMemo, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecommendedInvoices } from "@/hooks/useRecommendedInvoices";
import type { Invoice } from "@/lib/api";

const DISMISSED_KEY = "recommended-invoices-dismissed";

function loadDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>): void {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore
  }
}

function reasonChip(invoice: Invoice): string {
  const r = (invoice as unknown as Record<string, unknown>)._reason;
  if (typeof r === "string") return r;
  if (invoice.risk_tier) return "Similar tenor";
  if (invoice.debtor) return "Trusted debtor";
  return "Trending";
}

interface RecommendedInvoicesProps {
  /** Passed from the marketplace page so we know whether the user has any
   *  past investments. When undefined we cannot determine this and show the
   *  section anyway. */
  investmentCount?: number;
  limit?: number;
}

export function RecommendedInvoices({
  investmentCount,
  limit = 6,
}: RecommendedInvoicesProps) {
  const { data: invoices, isLoading, isError } = useRecommendedInvoices(limit);

  const [dismissed, setDismissed] = useState<Set<string>>(() => loadDismissed());

  // Sync from localStorage on mount (handles multiple tabs).
  useEffect(() => {
    setDismissed(loadDismissed());
  }, []);

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveDismissed(next);
      return next;
    });
  }, []);

  const visible = useMemo(
    () => (invoices ?? []).filter((inv) => !dismissed.has(inv.id)),
    [invoices, dismissed],
  );

  // Hide if user has 0 past investments AND no fallback data arrived.
  if (investmentCount === 0 && (!invoices || invoices.length === 0)) return null;

  if (isLoading) {
    return (
      <section aria-label="Recommended invoices" className="space-y-3">
        <Skeleton className="h-6 w-56" />
        <div className="flex gap-4 overflow-x-auto pb-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="min-w-[260px] shrink-0">
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-3/4" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-4 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  if (isError || visible.length === 0) return null;

  return (
    <section aria-label="Recommended invoices" data-testid="recommended-invoices">
      <h2 className="mb-3 text-xl font-bold">Recommended for you</h2>
      <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory">
        {visible.map((invoice) => {
          const fundingPct =
            invoice.amount > 0
              ? Math.min(100, Math.round((invoice.raised / invoice.amount) * 100))
              : 0;
          const reason = reasonChip(invoice);
          return (
            <Card
              key={invoice.id}
              className="min-w-[260px] max-w-[280px] shrink-0 snap-start flex flex-col border-primary/20 transition-shadow hover:shadow-md"
              data-testid={`recommended-invoice-${invoice.id}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-1">
                  <h3 className="line-clamp-1 font-semibold text-sm flex-1">{invoice.title}</h3>
                  <button
                    onClick={() => dismiss(invoice.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    aria-label={`Dismiss ${invoice.title}`}
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {invoice.yield_percentage != null && (
                    <Badge variant="default" className="text-xs">
                      {invoice.yield_percentage}% yield
                    </Badge>
                  )}
                  {invoice.risk_tier && (
                    <Badge variant="outline" className="text-xs">
                      {invoice.risk_tier}
                    </Badge>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{fundingPct}% funded</span>
                    <span>
                      {invoice.due_date
                        ? `${Math.max(0, Math.ceil((new Date(invoice.due_date).getTime() - Date.now()) / 86_400_000))}d left`
                        : null}
                    </span>
                  </div>
                  <Progress value={fundingPct} className="h-1.5" />
                </div>
                <div className="flex items-center justify-between gap-2 mt-auto">
                  <Badge variant="secondary" className="text-xs font-normal">
                    {reason}
                  </Badge>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/marketplace/${invoice.id}`}>View</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
