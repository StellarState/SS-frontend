"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchInvoices, type Invoice } from "@/lib/api";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MarketplaceFilterBar,
  FilterPanel,
  MarketplaceFilterState,
  FundingStatus,
  isExpired,
} from "@/components/marketplace";
import { Loader2, ArrowUp, ArrowDown } from "lucide-react";

type SortField = "amount" | "due_date" | null;
type SortDirection = "asc" | "desc";

function SortHeader({
  label,
  field,
  activeField,
  activeDirection,
  onSort,
}: {
  label: string;
  field: SortField;
  activeField: SortField;
  activeDirection: SortDirection;
  onSort: (field: SortField) => void;
}) {
  const isActive = activeField === field;
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className="inline-flex items-center gap-1 text-sm font-medium hover:text-foreground transition-colors"
      data-testid={`sort-${field}`}
    >
      {label}
      {isActive && activeDirection === "asc" && <ArrowUp className="size-3" />}
      {isActive && activeDirection === "desc" && <ArrowDown className="size-3" />}
    </button>
  );
}

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
        <div className="grid grid-cols-4 gap-4 text-sm text-muted-foreground">
          <div>
            <span className="block text-foreground font-medium">
              {invoice.amount.toLocaleString()} XLM
            </span>
            Amount
          </div>
          <div>
            <span className="block text-foreground font-medium">
              {invoice.yield_percentage !== undefined ? `${invoice.yield_percentage}%` : "N/A"}
            </span>
            Yield
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
        <div className="grid grid-cols-4 gap-4">
          <div>
            <Skeleton className="h-4 w-20 mb-1" />
            <Skeleton className="h-3 w-12" />
          </div>
          <div>
            <Skeleton className="h-4 w-12 mb-1" />
            <Skeleton className="h-3 w-10" />
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
  usePageTitle("Browse Invoices");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Initialize filter state from URL search params
  const initialStatuses = useMemo(() => {
    const raw = searchParams.get("statuses");
    if (!raw) return [];
    return raw.split(",").filter((s) => ["open", "funded", "settled", "expired"].includes(s)) as FundingStatus[];
  }, [searchParams]);

  const initialMinYield = useMemo(() => {
    const raw = searchParams.get("minYield");
    return raw ? Number(raw) || 0 : 0;
  }, [searchParams]);

  const initialFromDate = searchParams.get("fromDate") || "";
  const initialToDate = searchParams.get("toDate") || "";
  const initialStatus = (searchParams.get("status") as "open" | "funded" | "settled" | "all") || "all";
  const initialSearch = searchParams.get("search") || "";

  const [panelFilters, setPanelFilters] = useState<MarketplaceFilterState>({
    statuses: initialStatuses,
    minYield: initialMinYield,
    fromDate: initialFromDate,
    toDate: initialToDate,
  });

  const [status, setStatus] = useState<"open" | "funded" | "settled" | "all">(initialStatus);
  const [search, setSearch] = useState(initialSearch);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Sync state to URL params
  const updateUrlParams = useCallback(
    (newFilters: MarketplaceFilterState, newStatus: string, newSearch: string) => {
      const params = new URLSearchParams();
      if (newFilters.statuses.length > 0) {
        params.set("statuses", newFilters.statuses.join(","));
      }
      if (newFilters.minYield > 0) {
        params.set("minYield", newFilters.minYield.toString());
      }
      if (newFilters.fromDate) {
        params.set("fromDate", newFilters.fromDate);
      }
      if (newFilters.toDate) {
        params.set("toDate", newFilters.toDate);
      }
      if (newStatus !== "all") {
        params.set("status", newStatus);
      }
      if (newSearch) {
        params.set("search", newSearch);
      }

      const queryString = params.toString();
      const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.replace(targetUrl, { scroll: false });
    },
    [pathname, router]
  );

  const handleFilterChange = (newFilters: MarketplaceFilterState) => {
    setPanelFilters(newFilters);
    updateUrlParams(newFilters, status, debouncedSearch);
  };

  const queryParamsObj = useMemo(() => {
    const obj: Record<string, string> = {};
    if (panelFilters.statuses.length > 0) obj.statuses = panelFilters.statuses.join(",");
    if (panelFilters.minYield > 0) obj.minYield = panelFilters.minYield.toString();
    if (panelFilters.fromDate) obj.fromDate = panelFilters.fromDate;
    if (panelFilters.toDate) obj.toDate = panelFilters.toDate;
    if (status !== "all") obj.status = status;
    if (debouncedSearch) obj.search = debouncedSearch;
    return obj;
  }, [panelFilters, status, debouncedSearch]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
  } = useInfiniteQuery({
    queryKey: ["invoices", queryParamsObj],
    queryFn: ({ pageParam }) => fetchInvoices(pageParam as string | undefined, queryParamsObj),
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

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setDebouncedSearch(value);
        updateUrlParams(panelFilters, status, value);
      }, 300);
    },
    [panelFilters, status, updateUrlParams]
  );

  const handleStatusChange = useCallback(
    (newStatus: "open" | "funded" | "settled" | "all") => {
      setStatus(newStatus);
      updateUrlParams(panelFilters, newStatus, debouncedSearch);
    },
    [panelFilters, debouncedSearch, updateUrlParams]
  );

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        if (sortDirection === "asc") {
          setSortDirection("desc");
        } else {
          setSortField(null);
          setSortDirection("asc");
        }
      } else {
        setSortField(field);
        setSortDirection("asc");
      }
    },
    [sortField, sortDirection]
  );

  const handleClearAll = useCallback(() => {
    const emptyFilters: MarketplaceFilterState = {
      statuses: [],
      minYield: 0,
      fromDate: "",
      toDate: "",
    };
    setPanelFilters(emptyFilters);
    setStatus("all");
    setSearch("");
    setDebouncedSearch("");
    setSortField(null);
    setSortDirection("asc");
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  const filtered = useMemo(() => {
    let result = allInvoices.filter((inv) => {
      // Bar status filter
      const matchesBarStatus = status === "all" || inv.status === status;
      // Search filter
      const matchesSearch =
        debouncedSearch === "" ||
        inv.title.toLowerCase().includes(debouncedSearch.toLowerCase());

      // Panel funding status filter
      let matchesPanelStatus = true;
      if (panelFilters.statuses.length > 0) {
        matchesPanelStatus = panelFilters.statuses.some((st) => {
          if (st === "expired") {
            return isExpired(inv.due_date);
          }
          return inv.status === st;
        });
      }

      // Panel min yield filter
      let matchesYield = true;
      if (panelFilters.minYield > 0) {
        const y = inv.yield_percentage ?? 0;
        matchesYield = y >= panelFilters.minYield;
      }

      // Panel due date range filter
      let matchesFromDate = true;
      if (panelFilters.fromDate) {
        const invTime = new Date(inv.due_date).getTime();
        const fromTime = new Date(panelFilters.fromDate).getTime();
        matchesFromDate = invTime >= fromTime;
      }

      let matchesToDate = true;
      if (panelFilters.toDate) {
        const invTime = new Date(inv.due_date).getTime();
        // End of the day for toDate
        const toTime = new Date(`${panelFilters.toDate}T23:59:59.999Z`).getTime();
        matchesToDate = invTime <= toTime;
      }

      return (
        matchesBarStatus &&
        matchesSearch &&
        matchesPanelStatus &&
        matchesYield &&
        matchesFromDate &&
        matchesToDate
      );
    });

    if (sortField) {
      result = [...result].sort((a, b) => {
        let comparison: number;
        if (sortField === "amount") {
          comparison = a.amount - b.amount;
        } else {
          comparison = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [allInvoices, status, debouncedSearch, panelFilters, sortField, sortDirection]);

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Invoice Marketplace</h1>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-64 shrink-0">
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="flex-1 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Invoice Marketplace</h1>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Collapsible Filter Panel on the left */}
        <FilterPanel
          filters={panelFilters}
          onFilterChange={handleFilterChange}
          onClear={handleClearAll}
        />

        <div className="flex-1 space-y-4">
          <MarketplaceFilterBar
            status={status}
            search={search}
            onStatusChange={handleStatusChange}
            onSearchChange={handleSearchChange}
            onClear={handleClearAll}
          />

          {isFetching && !isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground my-4">
              <Loader2 className="size-3 animate-spin" />
              Refreshing…
            </div>
          )}

          <div className="flex items-center gap-6 mb-4 mt-4 text-sm text-muted-foreground">
            <SortHeader
              label="Face Value"
              field="amount"
              activeField={sortField}
              activeDirection={sortDirection}
              onSort={handleSort}
            />
            <SortHeader
              label="Deadline"
              field="due_date"
              activeField={sortField}
              activeDirection={sortDirection}
              onSort={handleSort}
            />
          </div>

          <div className="space-y-4">
            {filtered.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground" data-testid="no-invoices-msg">
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
        </div>
      </div>
    </main>
  );
}
