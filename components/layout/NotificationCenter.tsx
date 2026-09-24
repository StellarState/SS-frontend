"use client";

/**
 * Notification Centre (issue #283)
 *
 * Bell icon with unread badge opening a dropdown panel that lists system
 * notifications with read/unread state, individual mark-as-read on click
 * (which also navigates to the notification's target page), bulk
 * mark-all-as-read, and an empty state. The notification list is fetched
 * with React Query while the panel is open and refetched every time the
 * panel opens.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCheck, Inbox, X } from "lucide-react";

import {
  useNotifications,
  useUnreadCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  NOTIFICATIONS_QUERY_KEY,
  UNREAD_COUNT_QUERY_KEY,
} from "@/hooks/useNotifications";
import { NotificationBellBadge } from "@/components/layout/NotificationBellBadge";
import type { NotificationItem } from "@/lib/api";

function notificationTitle(notification: NotificationItem): string {
  return notification.title ?? notification.message ?? "";
}

export function NotificationCenter() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: unreadData } = useUnreadCount();
  const markOneRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const [open, setOpen] = useState(false);
  // Fetch while the panel is open; refetch every time it re-opens.
  const { data: notifications, isLoading, isError } = useNotifications({
    enabled: open,
    refetchOnMount: "always",
  });

  const unreadCount = unreadData?.count ?? 0;

  function toggle() {
    setOpen((prev) => !prev);
  }

  function handleClick(notification: NotificationItem) {
    if (!notification.read) {
      markOneRead.mutate(notification.id);
    }
    if (notification.link) {
      setOpen(false);
      router.push(notification.link);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notifications"
        data-testid="notification-bell"
        onClick={() => toggle()}
        className="rounded-md p-1 hover:bg-muted/50"
      >
        <NotificationBellBadge unreadCount={unreadCount > 0 ? unreadCount : null} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          data-testid="notification-panel"
          className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-border bg-background p-2 shadow-xl"
        >
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-sm font-semibold">Notifications</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                data-testid="mark-all-read-btn"
                disabled={unreadCount === 0 || markAllRead.isPending}
                onClick={() => markAllRead.mutate()}
                title="Mark all as read"
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted disabled:opacity-40"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
              <button
                type="button"
                aria-label="Close notifications"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              Loading…
            </div>
          ) : isError ? (
            <div className="px-3 py-6 text-center text-xs text-red-500">
              Failed to load notifications.
            </div>
          ) : !notifications || notifications.length === 0 ? (
            <div
              className="flex flex-col items-center gap-2 px-3 py-8 text-center"
              data-testid="notifications-empty"
            >
              <Inbox className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm font-medium">No notifications</p>
              <p className="text-xs text-muted-foreground">
                You're all caught up.
              </p>
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto" data-testid="notification-list">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    data-testid={`notification-item-${notification.id}`}
                    onClick={() => handleClick(notification)}
                    className={`flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left hover:bg-muted/60 ${
                      notification.read ? "opacity-60" : "bg-muted/40"
                    }`}
                  >
                    {!notification.read && (
                      <span
                        aria-hidden="true"
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                      />
                    )}
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-sm ${notification.read ? "font-normal" : "font-medium"}`}
                      >
                        {notificationTitle(notification)}
                      </span>
                      {notification.body && (
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {notification.body}
                        </span>
                      )}
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {notification.created_at
                          ? new Date(notification.created_at).toLocaleString()
                          : null}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// Keep the query keys exportable for tests and other consumers.
export { NOTIFICATIONS_QUERY_KEY, UNREAD_COUNT_QUERY_KEY };

export default NotificationCenter;
