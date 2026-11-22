"use client";

import { useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Download, Plus, Trash2, Calendar, ShieldCheck, DollarSign } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useReservePlanner,
  type UseReservePlannerOptions,
} from "@/hooks/useReservePlanner";
import { formatReserveExportCsv } from "@/lib/analytics/reservePlanner";

export interface ReservePlannerViewProps {
  options?: UseReservePlannerOptions;
}

export function ReservePlannerView({ options }: ReservePlannerViewProps) {
  const {
    obligations,
    contributions,
    currentBalance,
    selectedDate,
    setSelectedDate,
    addContribution,
    removeContribution,
    projection,
    isNotificationDismissed,
    dismissNotification,
  } = useReservePlanner(options);

  const [newContribAmount, setNewContribAmount] = useState("");
  const [newContribDate, setNewContribDate] = useState("");
  const [newContribLabel, setNewContribLabel] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const handleAddContribution = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(newContribAmount);
    if (isNaN(amount) || amount <= 0) {
      setFormError("Please enter a valid positive contribution amount.");
      return;
    }
    if (!newContribDate) {
      setFormError("Please select a scheduled contribution date.");
      return;
    }
    if (!newContribLabel.trim()) {
      setFormError("Please provide a label or reference for the contribution.");
      return;
    }

    addContribution({
      amount,
      scheduled_date: newContribDate,
      label: newContribLabel.trim(),
    });

    setNewContribAmount("");
    setNewContribDate("");
    setNewContribLabel("");
    setFormError(null);
  };

  const handleExportCsv = () => {
    const csvContent = formatReserveExportCsv(projection, obligations, contributions);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `reserve-plan-${projection.asOfDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6" data-testid="reserve-planner-view">
      {/* Header with Title and Export Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reserve Target Planner</h2>
          <p className="text-sm text-muted-foreground">
            Plan issuer cash reserves, project settlement coverage, and calculate shortfalls.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            data-testid="export-csv-button"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Date Selector Banner */}
      <Card className="bg-muted/40">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">Projection Target Date:</span>
          </div>
          <div className="flex items-center gap-3">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
              data-testid="target-date-picker"
              aria-label="Target Date"
            />
            <span className="text-xs text-muted-foreground">
              (Calculates obligations & contributions up to this date)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Threshold Warning Badges / Banners */}
      {projection.warningLevel === "overdue" && (
        <div
          role="alert"
          data-testid="overdue-warning-banner"
          className="flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-600 dark:text-red-400"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Overdue Settlement Obligation Warning</p>
              <p className="text-sm opacity-90">
                One or more obligations are overdue. Immediate reserve deposit or settlement is required.
              </p>
            </div>
          </div>
          <Badge variant="destructive">OVERDUE</Badge>
        </div>
      )}

      {projection.warningLevel === "7d" && (
        <div
          role="alert"
          data-testid="7d-warning-banner"
          className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-amber-600 dark:text-amber-400"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-semibold">7-Day Settlement Notice</p>
              <p className="text-sm opacity-90">
                Upcoming settlement is due in 7 days or less ({projection.daysUntilDue} days remaining).
              </p>
            </div>
          </div>
          <Badge variant="outline" className="border-amber-500 text-amber-600">
            ≤ 7 DAYS DUE
          </Badge>
        </div>
      )}

      {projection.warningLevel === "14d" && (
        <div
          role="alert"
          data-testid="14d-warning-banner"
          className="flex items-center justify-between rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-yellow-700 dark:text-yellow-400"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-semibold">14-Day Settlement Notice</p>
              <p className="text-sm opacity-90">
                Earliest obligation is due in {projection.daysUntilDue} days. Review liquidity schedule.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="border-yellow-500 text-yellow-700">
            14 DAYS DUE
          </Badge>
        </div>
      )}

      {projection.warningLevel === "30d" && (
        <div
          role="alert"
          data-testid="30d-warning-banner"
          className="flex items-center justify-between rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 text-blue-600 dark:text-blue-400"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-semibold">30-Day Settlement Notice</p>
              <p className="text-sm opacity-90">
                Earliest obligation is due in {projection.daysUntilDue} days. Plan scheduled reserve contributions.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="border-blue-500 text-blue-600">
            30 DAYS DUE
          </Badge>
        </div>
      )}

      {/* Shortfall Notification (stops when target is met) */}
      {projection.shouldNotifyShortfall && !isNotificationDismissed && (
        <div
          role="alert"
          data-testid="shortfall-notification"
          className="flex items-start justify-between rounded-lg border border-orange-500/30 bg-orange-500/10 p-4 text-orange-700 dark:text-orange-400"
        >
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Liquidity Shortfall Alert</p>
              <p className="text-sm opacity-90">
                Projected reserves have a shortfall of{" "}
                <span className="font-bold">${projection.shortfall.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>{" "}
                by {projection.asOfDate}. Please add scheduled contributions or deposit liquidity to meet your obligations.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={dismissNotification}
            data-testid="dismiss-notification-btn"
            className="text-xs text-orange-700 dark:text-orange-300 hover:bg-orange-500/20"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Key Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Current Balance */}
        <Card data-testid="current-balance-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="current-balance-val">
              ${projection.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Available reserve balance</p>
          </CardContent>
        </Card>

        {/* Target Obligations */}
        <Card data-testid="target-obligations-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Target Obligations</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="target-obligations-val">
              ${projection.targetObligations.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Due on or before {selectedDate}</p>
          </CardContent>
        </Card>

        {/* Scheduled Contributions */}
        <Card data-testid="scheduled-contributions-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Contributions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="scheduled-contributions-val">
              ${projection.scheduledContributionsTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Planned through {selectedDate}</p>
          </CardContent>
        </Card>

        {/* Shortfall or Surplus Status */}
        <Card
          data-testid="shortfall-status-card"
          className={
            projection.isFunded
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-red-500/30 bg-red-500/5"
          }
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {projection.isFunded ? "Reserve Status" : "Reserve Shortfall"}
            </CardTitle>
            {projection.isFunded ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            {projection.isFunded ? (
              <>
                <div className="text-2xl font-bold text-emerald-600" data-testid="surplus-val">
                  Fully Funded (+${projection.surplus.toLocaleString(undefined, { minimumFractionDigits: 2 })})
                </div>
                <p className="text-xs text-emerald-700/80">Projected reserves meet obligations</p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-red-600" data-testid="shortfall-val">
                  -${projection.shortfall.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-red-700/80">Additional liquidity required</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Grid: Obligations and Contributions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Obligations List */}
        <Card data-testid="obligations-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Due Obligations</CardTitle>
                <CardDescription>Upcoming settlements that define reserve targets</CardDescription>
              </div>
              <Badge variant="outline">{obligations.length} total</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {obligations.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No obligations found.</p>
              ) : (
                obligations.map((ob) => {
                  const isPastDue = ob.status === "overdue" || (ob.status !== "settled" && ob.due_date < new Date().toISOString().slice(0, 10));
                  return (
                    <div key={ob.id} className="flex items-center justify-between py-3" data-testid={`obligation-row-${ob.id}`}>
                      <div>
                        <p className="font-medium text-sm">{ob.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Due: {ob.due_date} • ID: {ob.id}
                        </p>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <span className="font-semibold text-sm">
                          ${ob.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        {ob.status === "settled" ? (
                          <Badge variant="secondary">Settled</Badge>
                        ) : isPastDue ? (
                          <Badge variant="destructive">Overdue</Badge>
                        ) : (
                          <Badge variant="outline" className="border-blue-500 text-blue-600">Upcoming</Badge>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Scheduled Contributions Section */}
        <Card data-testid="contributions-card">
          <CardHeader>
            <CardTitle className="text-lg">Scheduled Contributions</CardTitle>
            <CardDescription>Plan deposits to fulfill liquidity targets</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add Contribution Form */}
            <form onSubmit={handleAddContribution} className="space-y-3 rounded-lg border bg-muted/20 p-3" data-testid="add-contribution-form">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Add Scheduled Contribution
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label htmlFor="contrib-label" className="text-xs">Label</Label>
                  <Input
                    id="contrib-label"
                    placeholder="e.g. Treasury Sweep"
                    value={newContribLabel}
                    onChange={(e) => setNewContribLabel(e.target.value)}
                    className="h-8 text-xs"
                    data-testid="contrib-label-input"
                  />
                </div>
                <div>
                  <Label htmlFor="contrib-amount" className="text-xs">Amount ($)</Label>
                  <Input
                    id="contrib-amount"
                    type="number"
                    min="1"
                    step="any"
                    placeholder="Amount"
                    value={newContribAmount}
                    onChange={(e) => setNewContribAmount(e.target.value)}
                    className="h-8 text-xs"
                    data-testid="contrib-amount-input"
                  />
                </div>
                <div>
                  <Label htmlFor="contrib-date" className="text-xs">Date</Label>
                  <Input
                    id="contrib-date"
                    type="date"
                    value={newContribDate}
                    onChange={(e) => setNewContribDate(e.target.value)}
                    className="h-8 text-xs"
                    data-testid="contrib-date-input"
                  />
                </div>
              </div>

              {formError && (
                <p className="text-xs text-destructive" data-testid="contrib-form-error">{formError}</p>
              )}

              <Button type="submit" size="sm" className="w-full text-xs h-8 flex items-center gap-1" data-testid="submit-contribution-btn">
                <Plus className="h-3 w-3" />
                <span>Schedule Contribution</span>
              </Button>
            </form>

            {/* Contributions List */}
            <div className="divide-y divide-border">
              {contributions.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No scheduled contributions.</p>
              ) : (
                contributions.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2.5" data-testid={`contribution-row-${c.id}`}>
                    <div>
                      <p className="text-sm font-medium">{c.label}</p>
                      <p className="text-xs text-muted-foreground">Scheduled: {c.scheduled_date}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-emerald-600">
                        +${c.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeContribution(c.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        data-testid={`remove-contrib-btn-${c.id}`}
                        aria-label={`Remove ${c.label}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
