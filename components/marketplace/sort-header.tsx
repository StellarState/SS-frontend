"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  InvoiceSortKey,
  InvoiceSortState,
} from "@/lib/invoice-sort";

interface MarketplaceSortHeaderProps {
  sort: InvoiceSortState;
  onSort: (key: InvoiceSortKey) => void;
}

const SORTABLE_COLUMNS: { key: InvoiceSortKey; label: string }[] = [
  { key: "faceValue", label: "Face Value" },
  { key: "deadline", label: "Deadline" },
];

export function MarketplaceSortHeader({
  sort,
  onSort,
}: MarketplaceSortHeaderProps) {
  return (
    <div className="flex items-center justify-end gap-1 text-sm">
      <span className="mr-2 text-xs uppercase tracking-wide text-muted-foreground">
        Sort by
      </span>
      {SORTABLE_COLUMNS.map(({ key, label }) => {
        const active = sort.key === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSort(key)}
            aria-label={`Sort by ${label}`}
            aria-pressed={active}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-muted-foreground transition-colors hover:text-foreground",
              active && "bg-muted text-foreground"
            )}
          >
            {label}
            {active ? (
              sort.order === "asc" ? (
                <ArrowUp className="size-3" aria-hidden />
              ) : (
                <ArrowDown className="size-3" aria-hidden />
              )
            ) : (
              <ArrowUpDown className="size-3 opacity-50" aria-hidden />
            )}
          </button>
        );
      })}
    </div>
  );
}
