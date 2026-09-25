"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type InvoiceStatus = "open" | "funded" | "settled";

interface MarketplaceFilterBarProps {
  status: InvoiceStatus | "all";
  search: string;
  onStatusChange: (value: InvoiceStatus | "all") => void;
  onSearchChange: (value: string) => void;
  onClear: () => void;
}

export function MarketplaceFilterBar({
  status,
  search,
  onStatusChange,
  onSearchChange,
  onClear,
}: MarketplaceFilterBarProps) {
  const hasFilters = status !== "all" || search.length > 0;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="space-y-1.5">
        {/* Radix renders a button, not a labelable element, so the visible
            caption is a <span> tied to the trigger with aria-labelledby. */}
        <span
          id="status-filter-label"
          className="text-sm font-medium leading-none"
        >
          Status
        </span>
        <Select
          value={status}
          onValueChange={(v) => onStatusChange(v as InvoiceStatus | "all")}
        >
          <SelectTrigger
            className="w-full sm:w-[160px]"
            aria-labelledby="status-filter-label"
          >
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="funded">Funded</SelectItem>
            <SelectItem value="settled">Settled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="relative flex-1 space-y-1.5">
        <Label htmlFor="marketplace-search" className="text-sm font-medium leading-none">
          Search invoices
        </Label>
        <div className="relative">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="marketplace-search"
            type="search"
            placeholder="Search by title…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X aria-hidden="true" className="size-4" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
