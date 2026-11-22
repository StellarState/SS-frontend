"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const MAX_VIEWS = 20;
const LS_KEY = "tipz_saved_views";
const VIEWS_QUERY_KEY = ["saved-views"] as const;

export interface SavedView {
  id: string;
  name: string;
  /** Encoded filter state as a URLSearchParams string */
  params: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Local-storage helpers
// ---------------------------------------------------------------------------

function readLocalViews(): SavedView[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as SavedView[]) : [];
  } catch {
    return [];
  }
}

function writeLocalViews(views: SavedView[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(views));
}

// ---------------------------------------------------------------------------
// API helpers (fall back to localStorage on 4xx)
// ---------------------------------------------------------------------------

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "/api";

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<{ data: T; ok: true } | { ok: false; status: number }> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) return { ok: false, status: res.status };
  const data: T = res.status === 204 ? (null as unknown as T) : await res.json();
  return { ok: true, data };
}

export function encodeFilters(filters: Record<string, string>): string {
  return new URLSearchParams(filters).toString();
}

export function decodeFilters(params: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(params).entries());
}

// ---------------------------------------------------------------------------
// Query: list saved views
// ---------------------------------------------------------------------------

export function useSavedViews() {
  return useQuery<SavedView[]>({
    queryKey: VIEWS_QUERY_KEY,
    queryFn: async () => {
      const result = await apiFetch<SavedView[]>("/views");
      if (result.ok) return result.data;
      // 4xx → fall back to localStorage
      return readLocalViews();
    },
    staleTime: 60_000,
  });
}

// ---------------------------------------------------------------------------
// Mutation: save a new view
// ---------------------------------------------------------------------------

interface SaveViewVars {
  name: string;
  params: string;
}

export function useSaveView() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, params }: SaveViewVars) => {
      const current = queryClient.getQueryData<SavedView[]>(VIEWS_QUERY_KEY) ?? [];
      if (current.length >= MAX_VIEWS) {
        throw new Error(`You have reached the maximum of ${MAX_VIEWS} saved views.`);
      }
      const newView: SavedView = {
        id: crypto.randomUUID(),
        name,
        params,
        createdAt: new Date().toISOString(),
      };
      const result = await apiFetch<SavedView>("/views", {
        method: "POST",
        body: JSON.stringify({ name, params }),
      });
      if (!result.ok) {
        // Fallback: save locally
        const updated = [...current, newView];
        writeLocalViews(updated);
        return newView;
      }
      return result.data;
    },
    onSuccess: (newView) => {
      queryClient.setQueryData<SavedView[]>(VIEWS_QUERY_KEY, (old = []) => [
        ...old,
        newView,
      ]);
      toast.success(`View "${newView.name}" saved.`);
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Could not save view.");
    },
  });
}

// ---------------------------------------------------------------------------
// Mutation: rename a view
// ---------------------------------------------------------------------------

interface RenameViewVars {
  id: string;
  name: string;
}

export function useRenameView() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: RenameViewVars) => {
      const result = await apiFetch<SavedView>(`/views/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      if (!result.ok) {
        // Fallback: update locally
        const current = readLocalViews();
        writeLocalViews(current.map((v) => (v.id === id ? { ...v, name } : v)));
        return { id, name } as SavedView;
      }
      return result.data;
    },
    onSuccess: ({ id, name }) => {
      queryClient.setQueryData<SavedView[]>(VIEWS_QUERY_KEY, (old = []) =>
        old.map((v) => (v.id === id ? { ...v, name } : v)),
      );
      toast.success(`View renamed to "${name}".`);
    },
    onError: () => {
      toast.error("Could not rename view.");
    },
  });
}

// ---------------------------------------------------------------------------
// Mutation: delete a view
// ---------------------------------------------------------------------------

export function useDeleteView() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await apiFetch(`/views/${id}`, { method: "DELETE" });
      if (!result.ok) {
        const current = readLocalViews();
        writeLocalViews(current.filter((v) => v.id !== id));
      }
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<SavedView[]>(VIEWS_QUERY_KEY, (old = []) =>
        old.filter((v) => v.id !== id),
      );
      toast.success("View deleted.");
    },
    onError: () => {
      toast.error("Could not delete view.");
    },
  });
}
