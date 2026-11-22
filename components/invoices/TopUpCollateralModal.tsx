"use client";
/**
 * Top-up collateral modal (#644).
 *
 * Amount input with a live preview of the resulting ratio after top-up.
 * Confirms by POSTing to `/api/invoices/{id}/collateral/topup` and
 * invalidates the collateral query on success.
 */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { COLLATERAL_QUERY_KEY, type CollateralHealth } from "@/hooks/useCollateralHealth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

async function postTopUp(invoiceId: string, amount: number): Promise<void> {
  const res = await fetch(`${API_BASE}/invoices/${invoiceId}/collateral/topup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount }),
  });
  if (!res.ok) throw new Error("Top-up failed");
}

function ratioColor(ratio: number): string {
  if (ratio >= 1.5) return "bg-green-500";
  if (ratio >= 1.1) return "bg-yellow-500";
  return "bg-red-500";
}

interface TopUpCollateralModalProps {
  invoiceId: string;
  health: CollateralHealth;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TopUpCollateralModal({
  invoiceId,
  health,
  open,
  onOpenChange,
}: TopUpCollateralModalProps) {
  const [amount, setAmount] = useState("");
  const queryClient = useQueryClient();

  const topUpAmount = Number(amount) || 0;
  const previewPosted = health.posted + topUpAmount;
  const previewRatio =
    health.required > 0 ? previewPosted / health.required : health.ratio;
  const previewPct = Math.min(100, Math.round(previewRatio * 50));

  const mutation = useMutation({
    mutationFn: () => postTopUp(invoiceId, topUpAmount),
    onSuccess: () => {
      toast.success("Collateral topped up successfully");
      queryClient.invalidateQueries({ queryKey: COLLATERAL_QUERY_KEY(invoiceId) });
      setAmount("");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Top-up failed. Please try again.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Top up collateral</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          <div className="rounded-md border p-4 space-y-2 bg-muted/40 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Required</span>
              <span className="font-medium">{health.required.toLocaleString()} XLM</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Currently posted</span>
              <span className="font-medium">{health.posted.toLocaleString()} XLM</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current ratio</span>
              <span className="font-medium">{(health.ratio * 100).toFixed(0)}%</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="topup-amount">Amount to top up (XLM)</Label>
            <Input
              id="topup-amount"
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {topUpAmount > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Resulting ratio</span>
                <span className="font-medium">{(previewRatio * 100).toFixed(0)}%</span>
              </div>
              <Progress
                value={previewPct}
                className={`h-2 [&>div]:${ratioColor(previewRatio)}`}
              />
              <p className="text-xs text-muted-foreground">
                Posted after top-up: {previewPosted.toLocaleString()} XLM
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={topUpAmount <= 0 || mutation.isPending}
            >
              {mutation.isPending ? "Confirming…" : "Confirm top-up"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
