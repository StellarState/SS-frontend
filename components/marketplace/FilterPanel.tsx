"use client";

import { useState } from "react";
import { Filter, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export type FundingStatus = "open" | "funded" | "settled" | "expired";

export interface MarketplaceFilterState {
  statuses: FundingStatus[];
  minYield: number;
  fromDate: string;
  toDate: string;
  minAmount: number;
  maxAmount: number;
}

interface FilterPanelProps {
  filters: MarketplaceFilterState;
  onFilterChange: (newFilters: MarketplaceFilterState) => void;
  onClear: () => void;
}

const STATUS_OPTIONS: { label: string; value: FundingStatus }[] = [
  { label: "Open", value: "open" },
  { label: "Funded", value: "funded" },
  { label: "Settled", value: "settled" },
  { label: "Expired", value: "expired" },
];

export function FilterPanel({ filters, onFilterChange, onClear }: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  const handleStatusToggle = (status: FundingStatus) => {
    const exists = filters.statuses.includes(status);
    const newStatuses = exists
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status];
    onFilterChange({ ...filters, statuses: newStatuses });
  };

  const activeCount =
    filters.statuses.length +
    (filters.minYield > 0 ? 1 : 0) +
    (filters.fromDate ? 1 : 0) +
    (filters.toDate ? 1 : 0) +
    (filters.minAmount > 0 ? 1 : 0) +
    (filters.maxAmount > 0 ? 1 : 0);

  return (
    <div className="w-full md:w-64 shrink-0 space-y-4">
      <div className="flex items-center justify-between rounded-lg border p-4 bg-card">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 font-semibold text-sm hover:text-foreground transition-colors"
          aria-expanded={isOpen}
          aria-controls="marketplace-filter-panel"
          data-testid="toggle-filter-panel"
        >
          <Filter aria-hidden="true" className="size-4" />
          <span>Filters</span>
          {activeCount > 0 && (
            <Badge
              variant="secondary"
              className="ml-1 px-1.5 py-0 text-xs"
              // "3" alone reads as a stray number; spell out what is counted.
              aria-label={`${activeCount} ${activeCount === 1 ? "filter" : "filters"} active`}
            >
              {activeCount}
            </Badge>
          )}
          {isOpen ? (
            <ChevronUp aria-hidden="true" className="size-4 ml-auto" />
          ) : (
            <ChevronDown aria-hidden="true" className="size-4 ml-auto" />
          )}
        </button>

        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-8 px-2 text-xs"
            data-testid="clear-filters-btn"
          >
            <X aria-hidden="true" className="size-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {isOpen && (
        <div
          id="marketplace-filter-panel"
          className="rounded-lg border p-4 space-y-6 bg-card"
          data-testid="filter-panel-content"
        >
          {/* Funding Status Multi-select */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Funding Status
            </legend>
            <div className="flex flex-col gap-2">
              {STATUS_OPTIONS.map((opt) => {
                const checked = filters.statuses.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className="flex items-center gap-2 text-sm cursor-pointer hover:text-foreground"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleStatusToggle(opt.value)}
                      className="size-4 rounded border-gray-300 accent-primary"
                      data-testid={`filter-status-${opt.value}`}
                    />
                    <span>{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* Minimum Yield Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label
                htmlFor="min-yield-slider"
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                Min Yield (%)
              </Label>
              <span className="text-sm font-medium">{filters.minYield}%</span>
            </div>
            {/* The slider had a visible caption that no label pointed at, so
                it had no accessible name at all. aria-valuetext spells the
                value out because a bare "12" is ambiguous on a range input. */}
            <input
              type="range"
              id="min-yield-slider"
              min="0"
              max="30"
              step="1"
              value={filters.minYield}
              onChange={(e) =>
                onFilterChange({ ...filters, minYield: Number(e.target.value) })
              }
              aria-valuetext={`${filters.minYield} percent`}
              className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
              data-testid="min-yield-slider"
            />
            <div className="flex justify-between text-xs text-muted-foreground" aria-hidden="true">
              <span>0%</span>
              <span>30%</span>
            </div>
          </div>

          {/* Due Date Range Picker */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Due Date Range
            </h3>
            <div className="space-y-2">
              <div>
                <Label htmlFor="from-date" className="text-xs text-muted-foreground mb-1 block">
                  From
                </Label>
                <Input
                  id="from-date"
                  type="date"
                  value={filters.fromDate}
                  onChange={(e) =>
                    onFilterChange({ ...filters, fromDate: e.target.value })
                  }
                  data-testid="from-date-input"
                />
              </div>
              <div>
                <Label htmlFor="to-date" className="text-xs text-muted-foreground mb-1 block">
                  To
                </Label>
                <Input
                  id="to-date"
                  type="date"
                  value={filters.toDate}
                  onChange={(e) =>
                    onFilterChange({ ...filters, toDate: e.target.value })
                  }
                  data-testid="to-date-input"
                />
              </div>
            </div>
          </div>

          {/* Amount Range */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Amount Range (XLM)
            </h3>
            <div className="space-y-2">
              <div>
                <Label htmlFor="min-amount" className="text-xs text-muted-foreground mb-1 block">
                  Min
                </Label>
                <Input
                  id="min-amount"
                  type="number"
                  min="0"
                  step="100"
                  value={filters.minAmount || ""}
                  onChange={(e) =>
                    onFilterChange({ ...filters, minAmount: Number(e.target.value) || 0 })
                  }
                  placeholder="0"
                  data-testid="min-amount-input"
                />
              </div>
              <div>
                <Label htmlFor="max-amount" className="text-xs text-muted-foreground mb-1 block">
                  Max
                </Label>
                <Input
                  id="max-amount"
                  type="number"
                  min="0"
                  step="100"
                  value={filters.maxAmount || ""}
                  onChange={(e) =>
                    onFilterChange({ ...filters, maxAmount: Number(e.target.value) || 0 })
                  }
                  placeholder="Any"
                  data-testid="max-amount-input"
                />
              </div>
            </div>
          </div>

          {/* Active Filter Chips */}
          {activeCount > 0 && (
            <div className="space-y-2" data-testid="active-filter-chips">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Active Filters
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {filters.statuses.map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs gap-1">
                    {s}
                    <button
                      type="button"
                      onClick={() => handleStatusToggle(s)}
                      className="ml-0.5 hover:text-foreground"
                      aria-label={`Remove ${s} filter`}
                    >
                      <X aria-hidden="true" className="size-3" />
                    </button>
                  </Badge>
                ))}
                {filters.minYield > 0 && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    Yield ≥ {filters.minYield}%
                    <button
                      type="button"
                      onClick={() => onFilterChange({ ...filters, minYield: 0 })}
                      className="ml-0.5 hover:text-foreground"
                      aria-label="Remove minimum yield filter"
                    >
                      <X aria-hidden="true" className="size-3" />
                    </button>
                  </Badge>
                )}
                {filters.fromDate && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    From {filters.fromDate}
                    <button
                      type="button"
                      onClick={() => onFilterChange({ ...filters, fromDate: "" })}
                      className="ml-0.5 hover:text-foreground"
                      aria-label="Remove from-date filter"
                    >
                      <X aria-hidden="true" className="size-3" />
                    </button>
                  </Badge>
                )}
                {filters.toDate && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    To {filters.toDate}
                    <button
                      type="button"
                      onClick={() => onFilterChange({ ...filters, toDate: "" })}
                      className="ml-0.5 hover:text-foreground"
                      aria-label="Remove to-date filter"
                    >
                      <X aria-hidden="true" className="size-3" />
                    </button>
                  </Badge>
                )}
                {filters.minAmount > 0 && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    Min {filters.minAmount} XLM
                    <button
                      type="button"
                      onClick={() => onFilterChange({ ...filters, minAmount: 0 })}
                      className="ml-0.5 hover:text-foreground"
                      aria-label="Remove minimum amount filter"
                    >
                      <X aria-hidden="true" className="size-3" />
                    </button>
                  </Badge>
                )}
                {filters.maxAmount > 0 && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    Max {filters.maxAmount} XLM
                    <button
                      type="button"
                      onClick={() => onFilterChange({ ...filters, maxAmount: 0 })}
                      className="ml-0.5 hover:text-foreground"
                      aria-label="Remove maximum amount filter"
                    >
                      <X aria-hidden="true" className="size-3" />
                    </button>
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
