"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchNotifications,
  markAllNotificationsAsRead,
  type NotificationsResponse,
} from "@/lib/api";

export const NOTIFICATIONS_QUERY_KEY = ["notifications"] as const;

export function useNotifications() {
  return useInfiniteQuery<NotificationsResponse>({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: ({ pageParam }) => fetchNotifications(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.next_cursor ?? undefined : undefined,
    staleTime: 60 * 1000,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => fetchNotifications(),
    select: (data) => data.unread_count,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsAsRead,

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: ["notifications", "unread-count"] });

      const previousPages = queryClient.getQueryData<{
        pages: NotificationsResponse[];
        pageParams: unknown[];
      }>(NOTIFICATIONS_QUERY_KEY);

      if (previousPages) {
        queryClient.setQueryData(NOTIFICATIONS_QUERY_KEY, {
          ...previousPages,
          pages: previousPages.pages.map((page) => ({
            ...page,
            notifications: page.notifications.map((n) => ({ ...n, is_read: true })),
            unread_count: 0,
          })),
        });
      }

      queryClient.setQueryData(["notifications", "unread-count"], 0);

      return { previousPages };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousPages) {
        queryClient.setQueryData(NOTIFICATIONS_QUERY_KEY, context.previousPages);
      }
      toast.error("Failed to mark notifications as read.");
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
