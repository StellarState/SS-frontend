import type { Invoice } from "@/lib/api";

export type InvoiceSortKey = "faceValue" | "deadline";
export type InvoiceSortOrder = "asc" | "desc";

export interface InvoiceSortState {
  key: InvoiceSortKey | null;
  order: InvoiceSortOrder;
}

export const DEFAULT_SORT_STATE: InvoiceSortState = {
  key: null,
  order: "asc",
};

export const SORT_QUERY_KEY = "sort";
export const ORDER_QUERY_KEY = "order";

/**
 * Advances the sort state for a column: no sort -> ascending -> descending ->
 * no sort (reset). Clicking a different column always starts ascending.
 */
export function cycleSort(
  current: InvoiceSortState,
  key: InvoiceSortKey
): InvoiceSortState {
  if (current.key !== key) {
    return { key, order: "asc" };
  }
  if (current.order === "asc") {
    return { key, order: "desc" };
  }
  return DEFAULT_SORT_STATE;
}

/**
 * Returns a new array sorted by the active sort state. Returns the input
 * unchanged when no column is active.
 */
export function sortInvoices(
  invoices: Invoice[],
  state: InvoiceSortState
): Invoice[] {
  if (!state.key) {
    return invoices;
  }

  const factor = state.order === "asc" ? 1 : -1;
  return [...invoices].sort((a, b) => {
    if (state.key === "faceValue") {
      return (a.amount - b.amount) * factor;
    }
    const aTime = new Date(a.due_date).getTime();
    const bTime = new Date(b.due_date).getTime();
    return (aTime - bTime) * factor;
  });
}

/** Reads a sort state from URL query params. */
export function parseSortState(params: URLSearchParams): InvoiceSortState {
  const key = params.get(SORT_QUERY_KEY);
  if (key !== "faceValue" && key !== "deadline") {
    return DEFAULT_SORT_STATE;
  }
  const order = params.get(ORDER_QUERY_KEY) === "desc" ? "desc" : "asc";
  return { key, order };
}

/** Writes a sort state into a copy of the given URL query params. */
export function serializeSortState(
  state: InvoiceSortState,
  params: URLSearchParams
): URLSearchParams {
  const next = new URLSearchParams(params);
  if (!state.key) {
    next.delete(SORT_QUERY_KEY);
    next.delete(ORDER_QUERY_KEY);
  } else {
    next.set(SORT_QUERY_KEY, state.key);
    next.set(ORDER_QUERY_KEY, state.order);
  }
  return next;
}
