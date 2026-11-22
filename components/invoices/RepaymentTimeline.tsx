"use client";
import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useRepaymentHistory, type RepaymentStatus } from "@/hooks/useRepaymentHistory";

const STATUS_LABELS: Record<RepaymentStatus, string> = {
  received: "Received",
  matched: "Matched",
  distributed: "Distributed",
};

const STATUS_VARIANTS: Record<
  RepaymentStatus,
  "default" | "secondary" | "outline"
> = {
  received: "outline",
  matched: "secondary",
  distributed: "default",
};

function formatAmount(amount: number): string {
  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} XLM`;
}

function truncateTxHash(hash: string): string {
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 6)}…${hash.slice(-6)}`;
}

export interface RepaymentTimelineProps {
  invoiceId: string;
}

export function RepaymentTimeline({ invoiceId }: RepaymentTimelineProps) {
  const { data, isLoading, isError } = useRepaymentHistory(invoiceId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Failed to load repayment history.
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { events, totalReceived, amountDue } = data;
  const progressPct =
    amountDue > 0 ? Math.min(100, (totalReceived / amountDue) * 100) : 0;
  const remaining = Math.max(0, amountDue - totalReceived);

  return (
    <Card data-testid="repayment-timeline">
      <CardHeader>
        <h2 className="text-lg font-semibold">Repayment history</h2>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {formatAmount(totalReceived)} of {formatAmount(amountDue)} received
            </span>
            <span className="font-medium">{progressPct.toFixed(1)}%</span>
          </div>
          <Progress value={progressPct} className="h-2" />
          {remaining > 0 && (
            <p className="text-xs text-muted-foreground">
              {formatAmount(remaining)} remaining
            </p>
          )}
        </div>

        {events.length === 0 ? (
          <p
            className="py-6 text-center text-sm text-muted-foreground"
            data-testid="repayment-empty"
          >
            No payments received yet.
          </p>
        ) : (
          <ol className="space-y-3" aria-label="Repayment events">
            {events.map((event) => {
              const isPartial =
                event.matchedAmount > 0 &&
                event.matchedAmount < event.amount;

              return (
                <li
                  key={event.id}
                  className="flex items-start justify-between gap-3 rounded-md border p-3"
                  data-testid={`repayment-event-${event.id}`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-sm">
                        {formatAmount(event.amount)}
                      </span>
                      <Badge variant={STATUS_VARIANTS[event.status]}>
                        {STATUS_LABELS[event.status]}
                      </Badge>
                      {isPartial && (
                        <Badge variant="outline" className="text-xs">
                          Partial — {formatAmount(event.matchedAmount)} matched
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                    {event.distributedAmount > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Distributed: {formatAmount(event.distributedAmount)}
                      </p>
                    )}
                  </div>
                  {event.txHash && (
                    <a
                      href={`https://stellar.expert/explorer/public/tx/${event.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                      aria-label={`View transaction ${event.txHash}`}
                    >
                      {truncateTxHash(event.txHash)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
