"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck, Loader2, Mail, MailOpen } from "lucide-react";
import { fetchNotifications, markAllNotificationsAsRead, type NotificationItem, type NotificationsResponse } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FilterTab = "all" | "unread";

function NotificationRow({ notification }: { notification: NotificationItem }) {
  return (
    <Card
      className={cn(
        "transition-colors",
        !notification.is_read && "border-l-2 border-l-primary bg-accent/30"
      )}
    >
      <CardContent className="flex items-start gap-3 p-4">
        <div className="mt-0.5 shrink-0">
          {notification.is_read ? (
            <MailOpen className="size-4 text-muted-foreground" />
          ) : (
            <Mail className="size-4 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{notification.title}</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {notification.message}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function SkeletonRow() {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <Skeleton className="size-4 rounded" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState<FilterTab>("all");

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
  } = useInfiniteQuery<NotificationsResponse>({
    queryKey: ["notifications"],
    queryFn: ({ pageParam }) => fetchNotifications(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.next_cursor ?? undefined : undefined,
    staleTime: 60 * 1000,
  });

  const queryClient = useQueryClient();

  const [markingAll, setMarkingAll] = useState(false);

  const handleMarkAllAsRead = useCallback(async () => {
    setMarkingAll(true);
    try {
      await markAllNotificationsAsRead();
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch {
      // error handled by sonner toast in the mutation
    } finally {
      setMarkingAll(false);
    }
  }, [queryClient]);

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

  const allNotifications = useMemo(
    () => data?.pages.flatMap((p) => p.notifications) ?? [],
    [data]
  );

  const displayedNotifications = useMemo(
    () =>
      filter === "all"
        ? allNotifications
        : allNotifications.filter((n) => !n.is_read),
    [allNotifications, filter]
  );

  const unreadCount = useMemo(
    () => allNotifications.filter((n) => !n.is_read).length,
    [allNotifications]
  );

  if (isLoading) {
    return (
      <main className="container mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Notifications</h1>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="size-6" />
          <h1 className="text-2xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={markingAll}
          >
            {markingAll ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <CheckCheck className="size-3" />
            )}
            Mark all as read
          </Button>
        )}
      </div>

      <div className="flex gap-1 mb-6 border-b">
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
            filter === "all"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          All
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
            filter === "unread"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Unread
          {unreadCount > 0 && (
            <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {isFetching && !isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Loader2 className="size-3 animate-spin" />
          Refreshing...
        </div>
      )}

      <div className="space-y-2">
        {displayedNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Bell className="size-8 mb-2" />
            <p className="text-sm">
              {filter === "unread" ? "No unread notifications" : "No notifications yet"}
            </p>
          </div>
        ) : (
          displayedNotifications.map((notification) => (
            <NotificationRow key={notification.id} notification={notification} />
          ))
        )}
        {isFetchingNextPage &&
          Array.from({ length: 3 }).map((_, i) => (
            <SkeletonRow key={`skeleton-${i}`} />
          ))}
        {hasNextPage && <div ref={sentinelRefCallback} className="h-4" />}
        {!hasNextPage && displayedNotifications.length > 0 && (
          <p className="text-center text-sm text-muted-foreground py-4">
            All caught up
          </p>
        )}
      </div>
    </main>
  );
}
