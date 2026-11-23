"use client";

import React, { useMemo } from "react";
import {
  Search,
  SlidersHorizontal,
  Bookmark,
  Shield,
  Layers,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  UnderwriterProfileCard,
} from "@/components/underwriting/UnderwriterProfileCard";
import {
  useUnderwriterDirectory,
  type CapacityFilterType,
} from "@/hooks/useUnderwriterProfile";
import { type UnderwriterProfile } from "@/lib/underwriting/reputationProfile";
import { MOCK_UNDERWRITERS } from "@/lib/underwriting/mockData";

export interface UnderwriterDirectoryProps {
  initialUnderwriters?: UnderwriterProfile[];
}

function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function UnderwriterDirectory({
  initialUnderwriters = MOCK_UNDERWRITERS,
}: UnderwriterDirectoryProps) {
  const {
    filteredUnderwriters,
    searchQuery,
    setSearchQuery,
    capacityFilter,
    setCapacityFilter,
    followedOnly,
    setFollowedOnly,
    toggleFollow,
  } = useUnderwriterDirectory(initialUnderwriters);

  // Network overview metrics
  const stats = useMemo(() => {
    let totalCap = 0;
    let totalActive = 0;
    let totalAvailable = 0;

    for (const u of initialUnderwriters) {
      totalCap += u.capacity?.totalCapacity ?? u.totalCapacity;
      totalActive += u.capacity?.activeCover ?? u.activeCover;
      totalAvailable += u.capacity?.availableCapacity ?? 0;
    }

    return {
      totalCap,
      totalActive,
      totalAvailable,
      count: initialUnderwriters.length,
    };
  }, [initialUnderwriters]);

  const capacityFilters: { id: CapacityFilterType; label: string }[] = [
    { id: "all", label: "All Underwriters" },
    { id: "available", label: "Available Capacity" },
    { id: "high-capacity", label: "High Capacity ($500k+)" },
    { id: "exhausted", label: "Exhausted" },
  ];

  return (
    <div className="space-y-6" data-testid="underwriter-directory">
      {/* Directory Header & Stats */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Underwriter Directory
          </h2>
          <p className="text-sm text-muted-foreground">
            Explore verified underwriters, track settlement reputation, capacity reconciliation, and slashing audit history.
          </p>
        </div>
      </div>

      {/* Aggregate Stats Overview */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5 text-primary" />
            <span>Underwriters</span>
          </div>
          <div className="mt-1 text-xl font-bold text-foreground" data-testid="stat-underwriter-count">
            {stats.count}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Layers className="h-3.5 w-3.5 text-sky-500" />
            <span>Total Capacity</span>
          </div>
          <div className="mt-1 text-xl font-bold text-foreground" data-testid="stat-total-capacity">
            {formatUSD(stats.totalCap)}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
            <span>Active Cover</span>
          </div>
          <div className="mt-1 text-xl font-bold text-sky-600 dark:text-sky-400" data-testid="stat-active-cover">
            {formatUSD(stats.totalActive)}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>Available Capacity</span>
          </div>
          <div className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400" data-testid="stat-available-capacity">
            {formatUSD(stats.totalAvailable)}
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search underwriters by name or Stellar address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="search-underwriter-input"
            aria-label="Search underwriters by name or Stellar address"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Capacity Filters */}
          <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Capacity filter">
            {capacityFilters.map((filter) => (
              <Button
                key={filter.id}
                type="button"
                variant={capacityFilter === filter.id ? "default" : "outline"}
                size="sm"
                onClick={() => setCapacityFilter(filter.id)}
                data-testid={`filter-capacity-${filter.id}`}
                className="text-xs"
              >
                {filter.label}
              </Button>
            ))}
          </div>

          {/* Followed Only Toggle */}
          <Button
            type="button"
            variant={followedOnly ? "secondary" : "outline"}
            size="sm"
            onClick={() => setFollowedOnly(!followedOnly)}
            data-testid="filter-followed-toggle"
            className="gap-1 text-xs"
          >
            <Bookmark className="h-3.5 w-3.5" />
            <span>Followed</span>
          </Button>
        </div>
      </div>

      {/* Underwriters List */}
      {filteredUnderwriters.length === 0 ? (
        <div
          data-testid="no-underwriters-found"
          className="rounded-lg border border-dashed p-10 text-center"
        >
          <Shield className="mx-auto h-8 w-8 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-semibold text-foreground">No underwriters match criteria</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Try adjusting your search terms or clearing the capacity filter.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 text-xs"
            onClick={() => {
              setSearchQuery("");
              setCapacityFilter("all");
              setFollowedOnly(false);
            }}
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="space-y-4" data-testid="underwriters-list">
          {filteredUnderwriters.map((profile) => (
            <UnderwriterProfileCard
              key={profile.id}
              profile={profile}
              onFollowToggle={(id) => toggleFollow(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
