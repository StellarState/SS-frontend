"use client";

/**
 * Wallet transaction history (#294).
 *
 * Every platform transaction for the connected wallet, newest first, with a
 * link to the transaction on Stellar Expert for on-chain verification. Older
 * pages load as the user scrolls to the bottom of the list.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Ban,
  CheckCheck,
  Tag,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TxHash } from "@/components/ui/tx-hash";
import { AccountingExportModal } from "@/components/transactions/AccountingExportModal";
import { useAuth } from "@/hooks/useAuth";
import { useActiveNetwork } from "@/hooks/useActiveNetwork";
import { useWalletTransactions } from "@/hooks/useWalletTransactions";
import {
  PLATFORM_TRANSACTION_TYPES,
  type PlatformTransaction,
  type PlatformTransactionStatus,
  type PlatformTransactionType,
} from "@/lib/api";

interface TypeStyle {
  label: string;
  icon: LucideIcon;
  className: string;
}

export const TRANSACTION_TYPE_STYLES: Record<PlatformTransactionType, TypeStyle> = {
  invest: { label: "Invest", icon: ArrowUpRight, className: "bg-blue-100 text-blue-800" },
  claim: { label: "Claim", icon: ArrowDownLeft, className: "bg-green-100 text-green-800" },
  list: { label: "List", icon: Tag, className: "bg-purple-100 text-purple-800" },
  cancel: { label: "Cancel", icon: Ban, className: "bg-gray-100 text-gray-800" },
  settle: { label: "Settle", icon: CheckCheck, className: "bg-emerald-100 text-emerald-800" },
};

const STATUS_STYLES: Record<PlatformTransactionStatus, { label: string; className: string }> = {
  success: { label: "Confirmed", className: "text-green-700" },
  pending: { label: "Pending", className: "text-amber-700" },
  failed: { label: "Failed", className: "text-red-700" },
};

/** Newest first. Unparseable dates sink to the bottom rather than throwing. */
export function sortNewestFirst(transactions: PlatformTransaction[]): PlatformTransaction[] {
  const time = (t: PlatformTransaction) => {
    const ms = new Date(t.createdAt).getTime();
    return Number.isNaN(ms) ? -Infinity : ms;
  };
  return [...transactions].sort((a, b) => time(b) - time(a));
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAmount(amount: number, currency: string): string {
  return `${amount.toLocaleString(undefined, { maximumFractionDigits: 7 })} ${currency}`;
}

interface TransactionHistoryProps {
  /** Defaults to the connected wallet. */
  address?: string | null;
}

export function TransactionHistory({ address }: TransactionHistoryProps) {
  const { address: authAddress, jwt } = useAuth();
  const { network } = useActiveNetwork();
  const walletAddress = address ?? authAddress;
  const [typeFilter, setTypeFilter] = useState<PlatformTransactionType | null>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } =
    useWalletTransactions(walletAddress, typeFilter, jwt);

  const transactions = useMemo(() => {
    const all = data?.pages.flatMap((page) => page.transactions) ?? [];
    // The server filters too; this guards against a backend that ignores `type`.
    const filtered = typeFilter ? all.filter((t) => t.type === typeFilter) : all;
    return sortNewestFirst(filtered);
  }, [data, typeFilter]);

  const observerRef = useRef<IntersectionObserver | null>(null);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      if (!node || typeof IntersectionObserver === "undefined") return;
      observerRef.current = new IntersectionObserver(handleIntersect, { rootMargin: "200px" });
      observerRef.current.observe(node);
    },
    [handleIntersect]
  );

  if (!walletAddress) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground" data-testid="tx-history-no-wallet">
          Connect your wallet to see your transactions.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="tx-history">
      <div className="flex flex-wrap items-center justify-between gap-2" role="toolbar" aria-label="Transaction history controls">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by transaction type">
          <Button
            size="sm"
            variant={typeFilter === null ? "default" : "outline"}
            aria-pressed={typeFilter === null}
            onClick={() => setTypeFilter(null)}
            data-testid="tx-filter-all"
          >
            All
          </Button>
          {PLATFORM_TRANSACTION_TYPES.map((type) => (
            <Button
              key={type}
              size="sm"
              variant={typeFilter === type ? "default" : "outline"}
              aria-pressed={typeFilter === type}
              onClick={() => setTypeFilter(type)}
              data-testid={`tx-filter-${type}`}
            >
              {TRANSACTION_TYPE_STYLES[type].label}
            </Button>
          ))}
        </div>
        <AccountingExportModal transactions={transactions} />
      </div>

      {isLoading ? (
        <div className="space-y-2" data-testid="tx-history-loading">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive" data-testid="tx-history-error">
          Couldn&apos;t load transactions. Try again shortly.
        </p>
      ) : transactions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground" data-testid="tx-history-empty">
            {typeFilter
              ? `No ${TRANSACTION_TYPE_STYLES[typeFilter].label.toLowerCase()} transactions yet.`
              : "No transactions yet."}
          </CardContent>
        </Card>
      ) : (
        <ol className="space-y-2" data-testid="tx-history-list">
          {transactions.map((tx) => {
            const style = TRANSACTION_TYPE_STYLES[tx.type];
            const status = STATUS_STYLES[tx.status];
            const Icon = style.icon;
            return (
              <li key={tx.id || tx.txHash || tx.createdAt} data-testid={`tx-row-${tx.id}`}>
                <Card>
                  <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.className}`}
                      data-testid={`tx-type-${tx.id}`}
                    >
                      <Icon className="size-3" aria-hidden="true" />
                      {style.label}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {tx.invoiceTitle ?? (tx.invoiceId ? `Invoice ${tx.invoiceId}` : style.label)}
                      </p>
                      <p className="text-xs text-muted-foreground" data-testid={`tx-date-${tx.id}`}>
                        {formatDate(tx.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold" data-testid={`tx-amount-${tx.id}`}>
                        {formatAmount(tx.amount, tx.currency)}
                      </p>
                      <p className={`text-xs ${status.className}`} data-testid={`tx-status-${tx.id}`}>
                        {status.label}
                      </p>
                    </div>
                    <div className="w-full sm:w-auto">
                      {tx.txHash ? (
                        <TxHash hash={tx.txHash} network={network} testId={`tx-hash-${tx.id}`} />
                      ) : (
                        <span className="text-xs text-muted-foreground">Not yet on-chain</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ol>
      )}

      <div ref={sentinelRef} data-testid="tx-history-sentinel" />
      {isFetchingNextPage && <Skeleton className="h-16 w-full" data-testid="tx-history-loading-more" />}
      {!hasNextPage && transactions.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">You&apos;ve reached your first transaction.</p>
      )}
    </div>
  );
}
