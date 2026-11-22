"use client";

import React, { useState } from "react";
import { useDebtorDirectory } from "@/hooks/useDebtorDirectory";
import { isDebtorWatched } from "@/lib/debtor/organisationDirectory";

interface DebtorOrganisationDirectoryProps {
  className?: string;
}

export function DebtorOrganisationDirectory({
  className = "",
}: DebtorOrganisationDirectoryProps) {
  const {
    debtors,
    totalCount,
    watchedIds,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    watchedOnly,
    setWatchedOnly,
    toggleWatch,
  } = useDebtorDirectory();

  const [expandedDebtorId, setExpandedDebtorId] = useState<string | null>(null);

  return (
    <div
      data-testid="debtor-organisation-directory"
      className={`rounded-xl border border-border bg-card p-6 shadow-sm text-card-foreground ${className}`}
    >
      {/* Directory Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4 mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            Debtor Organisation Directory
          </h2>
          <p className="text-sm text-muted-foreground">
            Verified corporate debtors, historical settlement records, and exposure analytics.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <label className="flex items-center gap-2 cursor-pointer font-medium">
            <input
              type="checkbox"
              data-testid="filter-watched-toggle"
              checked={watchedOnly}
              onChange={(e) => setWatchedOnly(e.target.checked)}
              className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
            />
            <span>Watched Only ({watchedIds.length})</span>
          </label>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 text-xs">
        <div className="sm:col-span-2">
          <input
            type="text"
            data-testid="search-debtors-input"
            placeholder="Search by organisation name or jurisdiction..."
            aria-label="Search by organisation name or jurisdiction"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <select
            data-testid="filter-status-select"
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Statuses</option>
            <option value="Trusted">Trusted</option>
            <option value="Neutral">Neutral</option>
            <option value="Watch">Watch</option>
            <option value="Blocked">Blocked</option>
          </select>
        </div>
      </div>

      {/* Directory Results */}
      {debtors.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-xs border border-dashed rounded-lg">
          No debtor organisations match your criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {debtors.map((debtor) => {
            const isWatched = isDebtorWatched(watchedIds, debtor.id);
            const isExpanded = expandedDebtorId === debtor.id;

            return (
              <div
                key={debtor.id}
                data-testid={`debtor-card-${debtor.id}`}
                className="rounded-lg border border-border bg-background p-4 transition-all hover:border-primary/40"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-sm">{debtor.name}</h3>
                    <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {debtor.jurisdiction}
                    </span>
                    <span
                      data-testid={`credit-rating-${debtor.id}`}
                      className="rounded bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-[10px] font-bold"
                    >
                      {debtor.creditRating}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        debtor.status === "Trusted"
                          ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                          : debtor.status === "Watch"
                          ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {debtor.status}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleWatch(debtor.id)}
                      data-testid={`watch-btn-${debtor.id}`}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium border transition-colors ${
                        isWatched
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-600"
                          : "border-input hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      {isWatched ? "★ Watching" : "☆ Watch"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedDebtorId(isExpanded ? null : debtor.id)
                      }
                      className="text-xs text-primary hover:underline"
                    >
                      {isExpanded ? "Hide Details" : "View Details"}
                    </button>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 text-xs">
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Active Obligations</span>
                    <span className="font-bold font-mono text-primary">
                      {debtor.activeObligationsXLM.toLocaleString()} XLM
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Settled Volume</span>
                    <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      {debtor.settledVolumeXLM.toLocaleString()} XLM
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Settlement Record</span>
                    <span className="font-medium">
                      {debtor.settledInvoicesCount} / {debtor.totalInvoicesCount} Invoices
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Dispute / Default Rate</span>
                    <span className={`font-semibold ${debtor.defaultRatePercent > 0 ? "text-amber-500" : "text-muted-foreground"}`}>
                      {debtor.defaultRatePercent}%
                    </span>
                  </div>
                </div>

                {/* Attestations Tags */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2 text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">Attestations:</span>
                  {debtor.approvedAttestations.map((att, i) => (
                    <span key={i} className="rounded bg-muted/60 px-2 py-0.5 border border-border text-[10px]">
                      ✔ {att}
                    </span>
                  ))}
                  {debtor.publicDocuments.length > 0 && (
                    <span className="text-primary ml-2 font-medium">
                      📄 {debtor.publicDocuments.length} Verified Public Docs
                    </span>
                  )}
                </div>

                {/* Expanded Invoice History */}
                {isExpanded && (
                  <div className="mt-4 pt-3 border-t border-border space-y-2">
                    <h4 className="text-xs font-semibold text-foreground">Recent Invoices</h4>
                    {debtor.recentInvoices.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground">No recent invoice history.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[11px]">
                          <thead className="text-muted-foreground bg-muted/30">
                            <tr>
                              <th className="py-1 px-2">Invoice #</th>
                              <th className="py-1 px-2">Amount</th>
                              <th className="py-1 px-2">Due Date</th>
                              <th className="py-1 px-2">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {debtor.recentInvoices.map((inv) => (
                              <tr key={inv.id}>
                                <td className="py-1 px-2 font-mono font-medium">{inv.invoiceNumber}</td>
                                <td className="py-1 px-2 font-mono">{inv.amountXLM.toLocaleString()} XLM</td>
                                <td className="py-1 px-2 text-muted-foreground">{inv.dueDate}</td>
                                <td className="py-1 px-2">
                                  <span
                                    className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${
                                      inv.status === "settled"
                                        ? "text-emerald-600 bg-emerald-500/10"
                                        : inv.status === "in_dispute"
                                        ? "text-destructive bg-destructive/10"
                                        : "text-blue-600 bg-blue-500/10"
                                    }`}
                                  >
                                    {inv.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
