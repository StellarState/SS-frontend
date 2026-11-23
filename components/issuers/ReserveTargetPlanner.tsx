"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  Plus,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  addScheduledContribution,
  calculateReservePlannerSummary,
  exportReservePlanToCsv,
  removeScheduledContribution,
  type ScheduledContribution,
  type SettlementObligation,
} from "@/lib/reservePlanner";

interface ReserveTargetPlannerProps {
  issuerId?: string;
  initialBalance?: number;
  initialObligations?: SettlementObligation[];
  initialContributions?: ScheduledContribution[];
  currency?: string;
}

const DEFAULT_OBLIGATIONS: SettlementObligation[] = [
  {
    id: "obl-1",
    invoiceId: "INV-8021",
    invoiceTitle: "Logistics Vehicle Fleet Settlement",
    dueDate: new Date(Date.now() + 86_400_000 * 5).toISOString().slice(0, 10), // in 5 days (7d window)
    amount: 15000,
    currency: "USDC",
    status: "pending",
  },
  {
    id: "obl-2",
    invoiceId: "INV-8035",
    invoiceTitle: "Solar Array Inverter Shipments",
    dueDate: new Date(Date.now() + 86_400_000 * 12).toISOString().slice(0, 10), // in 12 days (14d window)
    amount: 22000,
    currency: "USDC",
    status: "pending",
  },
  {
    id: "obl-3",
    invoiceId: "INV-8049",
    invoiceTitle: "Semiconductor Sensor Components",
    dueDate: new Date(Date.now() + 86_400_000 * 24).toISOString().slice(0, 10), // in 24 days (30d window)
    amount: 35000,
    currency: "USDC",
    status: "pending",
  },
  {
    id: "obl-4",
    invoiceId: "INV-8060",
    invoiceTitle: "Raw Copper Cathode Purchase",
    dueDate: new Date(Date.now() + 86_400_000 * 45).toISOString().slice(0, 10), // in 45 days
    amount: 40000,
    currency: "USDC",
    status: "pending",
  },
];

const DEFAULT_CONTRIBUTIONS: ScheduledContribution[] = [
  {
    id: "contrib-init-1",
    date: new Date(Date.now() + 86_400_000 * 3).toISOString().slice(0, 10),
    amount: 10000,
    sourceAccount: "Issuer Treasury Multi-Sig",
    description: "Operating account settlement top-up",
    recurring: "none",
  },
];

export function ReserveTargetPlanner({
  initialBalance = 18000,
  initialObligations = DEFAULT_OBLIGATIONS,
  initialContributions = DEFAULT_CONTRIBUTIONS,
  currency = "USDC",
}: ReserveTargetPlannerProps) {
  const [balance, setBalance] = useState<number>(initialBalance);
  const [obligations] = useState<SettlementObligation[]>(initialObligations);
  const [contributions, setContributions] =
    useState<ScheduledContribution[]>(initialContributions);

  // New contribution form state
  const [newContribAmount, setNewContribAmount] = useState("");
  const [newContribDate, setNewContribDate] = useState(
    new Date(Date.now() + 86_400_000 * 7).toISOString().slice(0, 10)
  );
  const [newContribSource, setNewContribSource] = useState("Treasury Account");
  const [newContribDesc, setNewContribDesc] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const summary = useMemo(
    () =>
      calculateReservePlannerSummary(
        balance,
        obligations,
        contributions,
        Date.now(),
        currency
      ),
    [balance, obligations, contributions, currency]
  );

  const handleAddContribution = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const amountNum = parseFloat(newContribAmount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setFormError("Contribution amount must be greater than zero");
      return;
    }

    if (!newContribDate) {
      setFormError("Contribution date is required");
      return;
    }

    const updated = addScheduledContribution(contributions, {
      date: newContribDate,
      amount: amountNum,
      sourceAccount: newContribSource.trim() || "Treasury Account",
      description: newContribDesc.trim(),
    });

    setContributions(updated);
    setNewContribAmount("");
    setNewContribDesc("");
  };

  const handleRemoveContribution = (id: string) => {
    setContributions((prev) => removeScheduledContribution(prev, id));
  };

  const handleExportCsv = () => {
    const csvContent = exportReservePlanToCsv(summary, obligations, contributions);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `reserve_planner_plan_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6" data-testid="reserve-target-planner">
      {/* Header and Export Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Issuer Liquidity Reserve Target Planner</h2>
          <p className="text-xs text-muted-foreground">
            Plan settlement liquidity, schedule reserve contributions, and monitor 30/14/7-day threshold warnings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            data-testid="export-reserve-plan-csv"
          >
            <Download className="mr-1.5 h-4 w-4" />
            Export Plan (CSV)
          </Button>
        </div>
      </div>

      {/* Threshold Warning Banners (30, 14, 7 days) */}
      {summary.activeWarnings.length > 0 && (
        <div className="space-y-2" data-testid="threshold-warnings-container">
          {summary.activeWarnings.map((warning) => (
            <div
              key={warning.obligationId}
              className={`flex items-start gap-3 rounded-lg border p-3.5 text-sm ${
                warning.severity === "critical"
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : warning.severity === "warning"
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                  : "border-blue-500/40 bg-blue-500/10 text-blue-800 dark:text-blue-300"
              }`}
              data-testid={`warning-alert-${warning.obligationId}`}
            >
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2 font-semibold">
                  <span>{warning.message}</span>
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {warning.threshold}-Day Alert
                  </Badge>
                </div>
                <p className="text-xs mt-0.5 opacity-90">
                  Obligation: {warning.invoiceTitle} | Due Date: {warning.dueDate} ({warning.daysRemaining} days left) | Required: {warning.requiredAmount.toLocaleString()} {currency}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Target Met Notification Banner */}
      {summary.targetMet && (
        <div
          className="flex items-center gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-300"
          data-testid="target-funded-banner"
        >
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <div>
            <span className="font-semibold">Reserve Target Met</span>
            <p className="text-xs opacity-90">
              Current reserves and scheduled contributions fully cover all upcoming obligations. All shortfall warning notifications have ceased.
            </p>
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card data-testid="kpi-current-balance">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Current Reserve Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.currentBalance.toLocaleString()} {currency}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <Label htmlFor="adjust-balance" className="text-[11px] text-muted-foreground">
                Adjust:
              </Label>
              <Input
                id="adjust-balance"
                type="number"
                className="h-7 w-28 text-xs"
                value={balance}
                onChange={(e) => setBalance(parseFloat(e.target.value) || 0)}
                data-testid="input-adjust-balance"
              />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="kpi-upcoming-obligations">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Upcoming Obligations (Target)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.totalUpcomingObligations.toLocaleString()} {currency}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Target equals settlement total
            </p>
          </CardContent>
        </Card>

        <Card data-testid="kpi-scheduled-contributions">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Scheduled Contributions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              +{summary.totalScheduledContributions.toLocaleString()} {currency}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {contributions.length} scheduled transfer(s)
            </p>
          </CardContent>
        </Card>

        <Card data-testid="kpi-projected-shortfall">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Projected Shortfall / Excess
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                summary.overallShortfall > 0 ? "text-destructive" : "text-emerald-600"
              }`}
            >
              {summary.overallShortfall > 0
                ? `-${summary.overallShortfall.toLocaleString()} ${currency}`
                : `+${summary.projectedEndingBalance.toLocaleString()} ${currency}`}
            </div>
            <Badge
              variant={summary.targetMet ? "default" : "destructive"}
              className="mt-1 text-[10px]"
            >
              {summary.targetMet ? "Fully Funded" : "Shortfall Active"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Settlement Obligations Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Upcoming Settlement Obligations</CardTitle>
              <span className="text-xs text-muted-foreground">
                Total: {obligations.length} obligations
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice / Obligation</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {obligations.map((obl) => (
                  <TableRow key={obl.id} data-testid={`obligation-row-${obl.id}`}>
                    <TableCell>
                      <div className="font-medium text-sm">{obl.invoiceTitle}</div>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {obl.invoiceId}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {obl.dueDate}
                    </TableCell>
                    <TableCell className="font-semibold text-sm">
                      {obl.amount.toLocaleString()} {obl.currency}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {obl.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Scheduled Contributions & Add Form */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Schedule Reserve Contribution</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddContribution} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="contrib-amount" className="text-xs">
                      Amount ({currency})
                    </Label>
                    <Input
                      id="contrib-amount"
                      type="number"
                      placeholder="e.g. 15000"
                      value={newContribAmount}
                      onChange={(e) => setNewContribAmount(e.target.value)}
                      data-testid="input-contrib-amount"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="contrib-date" className="text-xs">
                      Deposit Date
                    </Label>
                    <Input
                      id="contrib-date"
                      type="date"
                      value={newContribDate}
                      onChange={(e) => setNewContribDate(e.target.value)}
                      data-testid="input-contrib-date"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="contrib-source" className="text-xs">
                      Source Account
                    </Label>
                    <Input
                      id="contrib-source"
                      placeholder="e.g. Treasury Wallet"
                      value={newContribSource}
                      onChange={(e) => setNewContribSource(e.target.value)}
                      data-testid="input-contrib-source"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="contrib-desc" className="text-xs">
                      Note / Description
                    </Label>
                    <Input
                      id="contrib-desc"
                      placeholder="e.g. Commercial cash collection"
                      value={newContribDesc}
                      onChange={(e) => setNewContribDesc(e.target.value)}
                      data-testid="input-contrib-desc"
                    />
                  </div>
                </div>

                {formError && (
                  <p className="text-xs text-destructive" data-testid="contrib-form-error">
                    {formError}
                  </p>
                )}

                <div className="flex justify-end pt-1">
                  <Button type="submit" size="sm" data-testid="add-contribution-btn">
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add Scheduled Contribution
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Contributions List */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Active Scheduled Contributions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {contributions.length === 0 ? (
                <p className="text-xs text-muted-foreground py-3 text-center">
                  No future contributions scheduled.
                </p>
              ) : (
                contributions.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-md border p-2.5 text-xs"
                    data-testid={`contribution-item-${c.id}`}
                  >
                    <div>
                      <div className="font-semibold text-sm">
                        +{c.amount.toLocaleString()} {currency}
                      </div>
                      <div className="text-muted-foreground text-[11px]">
                        Date: {c.date} | From: {c.sourceAccount} {c.description ? `(${c.description})` : ""}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveContribution(c.id)}
                      aria-label="Remove contribution"
                      data-testid={`remove-contrib-${c.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
