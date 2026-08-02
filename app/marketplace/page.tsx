"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { fetchInvoices, type Invoice } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MarketplaceFilterBar,
  MarketplaceSortHeader,
} from "@/components/marketplace";
import {
  cycleSort,
  DEFAULT_SORT_STATE,
  parseSortState,
  serializeSortState,
  sortInvoices,
  type InvoiceSortKey,
  type InvoiceSortState,
} from "@/lib/invoice-sort";
import { Loader2 } from "lucide-react";

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{invoice.title}</h3>
          <Badge variant={invoice.status === "open" ? "default" : "secondary"}>
            {invoice.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
          <div>
            <span className="block text-foreground font-medium">
              {invoice.amount.toLocaleString()} XLM
            </span>
            Amount
          </div>
          <div>
            <span className="block text-foreground font-medium">
              {invoice.investor_count}
            </span>
            Investors
          </div>
          <div>
            <span className="block text-foreground font-medium">
              {new Date(invoice.due_date).toLocaleDateString()}
            </span>
            Due Date
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SkeletonRow() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-16" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Skeleton className="h-4 w-20 mb-1" />
            <Skeleton className="h-3 w-12" />
          </div>
          <div>
            <Skeleton className="h-4 w-8 mb-1" />
            <Skeleton className="h-3 w-14" />
          </div>
          <div>
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MarketplacePage() {
  const router = useRouter();
  const pathname = usePathname();

  const [sortState, setSortState] = useState<InvoiceSortState>(() => {
    if (typeof window === "undefined") return DEFAULT_SORT_STATE;
    return parseSortState(new URLSearchParams(window.location.search));
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
  } = useInfiniteQuery({
    queryKey: ["invoices"],
    queryFn: ({ pageParam }) => fetchInvoices(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.next_cursor ?? undefined : undefined,
    staleTime: 60 * 1000,
  });

  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  const observer = useMemo(() => {
    if (typeof window === "undefined") return null;
    return new IntersectionObserver(handleIntersect, { rootMargin: "200px" });
  }, [handleIntersect]);

  const sentinelRefCallback = useCallback(
    (node: HTMLDivElement | null) => {
      if (observer) {
        if (sentinelRef.current) observer.unobserve(sentinelRef.current);
        if (node) observer.observe(node);
      }
      (sentinelRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    },
    [observer]
  );

  const allInvoices = useMemo(
    () => data?.pages.flatMap((p) => p.invoices) ?? [],
    [data]
  );

  const [status, setStatus] = useState<"open" | "funded" | "settled" | "all">("all");
  const [search, setSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  }, []);

  const handleClear = useCallback(() => {
    setStatus("all");
    setSearch("");
    setDebouncedSearch("");
    setSortState(DEFAULT_SORT_STATE);
    if (typeof window !== "undefined") {
      const params = serializeSortState(
        DEFAULT_SORT_STATE,
        new URLSearchParams(window.location.search)
      );
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [router, pathname]);

  const handleSort = useCallback(
    (key: InvoiceSortKey) => {
      const next = cycleSort(sortState, key);
      setSortState(next);
      if (typeof window !== "undefined") {
        const params = serializeSortState(
          next,
          new URLSearchParams(window.location.search)
        );
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      }
    },
    [sortState, router, pathname]
  );

  const filtered = useMemo(() => {
    const matches = allInvoices.filter((inv) => {
      const matchesStatus = status === "all" || inv.status === status;
      const matchesSearch =
        debouncedSearch === "" ||
        inv.title.toLowerCase().includes(debouncedSearch.toLowerCase());
      return matchesStatus && matchesSearch;
    });
    return sortInvoices(matches, sortState);
  }, [allInvoices, status, debouncedSearch, sortState]);

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Invoice Marketplace</h1>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Invoice Marketplace</h1>

      <MarketplaceFilterBar
        status={status}
        search={search}
        onStatusChange={setStatus}
        onSearchChange={handleSearchChange}
        onClear={handleClear}
      />

      <div className="mt-4">
        <MarketplaceSortHeader sort={sortState} onSort={handleSort} />
      </div>

      {isFetching && !isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground my-4">
          <Loader2 className="size-3 animate-spin" />
          Refreshing…
        </div>
      )}

      <div className="space-y-4 mt-4">
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">
            No invoices match your filters.
          </p>
        ) : (
          filtered.map((invoice) => (
            <InvoiceRow key={invoice.id} invoice={invoice} />
          ))
        )}
        {isFetchingNextPage &&
          Array.from({ length: 3 }).map((_, i) => (
            <SkeletonRow key={`skeleton-${i}`} />
          ))}
        {hasNextPage && <div ref={sentinelRefCallback} className="h-4" />}
        {!hasNextPage && filtered.length > 0 && (
          <p className="text-center text-sm text-muted-foreground py-4">
            No more invoices
          </p>
        )}
      </div>
    </main>
  );
}
