"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Info, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWallet } from "@/context/WalletContext";
import {
  useEscapePositions,
  useEscapeStatus,
  useEscapeWithdrawMutation,
} from "@/hooks/useEscapeStatus";

function xlm(value: number): string {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 7 })} XLM`;
}

/**
 * /escape (#592): while the escape hatch is open, investors can pull the
 * pro-rata principal of each position back to their wallet. Redirects home
 * when escape mode is inactive.
 */
export function EscapeWithdrawPage() {
  const router = useRouter();
  const { address, isConnected } = useWallet();
  const status = useEscapeStatus();
  const positions = useEscapePositions(address, status.escapeEnabled);
  const withdraw = useEscapeWithdrawMutation(address);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const inactive = !status.isLoading && (status.isError || !status.escapeEnabled);

  useEffect(() => {
    if (inactive) router.replace("/");
  }, [inactive, router]);

  if (status.isLoading || inactive) {
    return <Skeleton className="h-40 w-full" data-testid="escape-loading" />;
  }

  function handleWithdraw(invoiceId: string) {
    setPendingId(invoiceId);
    setErrors((e) => {
      const { [invoiceId]: _drop, ...rest } = e;
      return rest;
    });
    withdraw.mutate(invoiceId, {
      onError: (error) => setErrors((e) => ({ ...e, [invoiceId]: error.message })),
      onSettled: () => setPendingId(null),
    });
  }

  return (
    <div className="space-y-6" data-testid="escape-page">
      <div>
        <h1 className="text-2xl font-semibold">Emergency withdrawal</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The protocol has been paused long enough for the escape hatch to open. You can recover
          your share of the principal still held in escrow for each position below.
        </p>
      </div>

      <div
        className="flex items-start gap-2 rounded-md border bg-muted/50 p-3 text-sm"
        data-testid="escape-yield-note"
      >
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p>
          Only principal is recoverable here. Accrued yield and bonuses are not included and
          remain subject to the normal settlement process.
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Your positions</h2>
        </CardHeader>
        <CardContent>
          {!isConnected || !address ? (
            <p className="text-sm text-muted-foreground" data-testid="escape-connect">
              Connect your wallet to see recoverable positions.
            </p>
          ) : positions.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : positions.isError ? (
            <p className="text-sm text-destructive" role="alert" data-testid="escape-positions-error">
              {positions.error instanceof Error ? positions.error.message : "Could not load positions."}
            </p>
          ) : !positions.data || positions.data.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground" data-testid="escape-empty">
              You have no positions to recover.
            </p>
          ) : (
            <ul className="divide-y" data-testid="escape-positions">
              {positions.data.map((pos) => {
                const isPending = pendingId === pos.invoice_id;
                const error = errors[pos.invoice_id];
                return (
                  <li key={pos.invoice_id} className="py-3" data-testid={`escape-row-${pos.invoice_id}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{pos.invoice_title}</p>
                        <p className="text-xs text-muted-foreground">Committed {xlm(pos.committed)}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Recoverable principal</p>
                          <p className="font-semibold" data-testid={`escape-recoverable-${pos.invoice_id}`}>
                            {xlm(pos.recoverable)}
                          </p>
                        </div>
                        {pos.withdrawn ? (
                          <Badge variant="outline" className="gap-1" data-testid={`escape-withdrawn-${pos.invoice_id}`}>
                            <CheckCircle2 className="h-3 w-3" />
                            Withdrawn
                          </Badge>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            disabled={isPending || pos.recoverable <= 0}
                            onClick={() => handleWithdraw(pos.invoice_id)}
                            data-testid={`escape-withdraw-${pos.invoice_id}`}
                          >
                            {isPending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                            Withdraw
                          </Button>
                        )}
                      </div>
                    </div>
                    {error && (
                      <p className="mt-2 text-sm text-destructive" role="alert" data-testid={`escape-error-${pos.invoice_id}`}>
                        {error}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
