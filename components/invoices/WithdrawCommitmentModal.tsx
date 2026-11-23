"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ExitFeeBreakdown } from "@/components/invoices/ExitFeeBreakdown";
import { FeeTrendHint } from "@/components/invoices/FeeTrendHint";
import { useWallet } from "@/context/WalletContext";
import { useExitPreview, useWithdrawCommitmentMutation } from "@/hooks/useExitPreview";
import { HIGH_EXIT_FEE_PERCENT, isHighExitFee } from "@/lib/exitFee";

interface WithdrawCommitmentModalProps {
  invoiceId: string;
  invoiceTitle?: string;
}

/**
 * Withdraw a commitment from an invoice that is still raising (#593). The
 * contract preview is shown before confirming — and refreshed every 15s while
 * open — so the fee is never a surprise.
 */
export function WithdrawCommitmentModal({ invoiceId, invoiceTitle }: WithdrawCommitmentModalProps) {
  const { address } = useWallet();
  const [open, setOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const preview = useExitPreview(invoiceId, address, { enabled: open });
  const withdraw = useWithdrawCommitmentMutation(invoiceId);

  const data = preview.data;
  const highFee = data ? isHighExitFee(data.fee_percent, data.fee_waived) : false;
  const canConfirm =
    Boolean(address) &&
    Boolean(data) &&
    data!.commitment > 0 &&
    !preview.isError &&
    (!highFee || acknowledged) &&
    !withdraw.isPending;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setAcknowledged(false);
      withdraw.reset();
    }
  }

  function handleConfirm() {
    if (!canConfirm || !address) return;
    withdraw.mutate({ wallet: address }, { onSuccess: () => handleOpenChange(false) });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" disabled={!address} data-testid="withdraw-commitment-open">
          Withdraw commitment
        </Button>
      </DialogTrigger>
      <DialogContent data-testid="withdraw-commitment-modal">
        <DialogHeader>
          <DialogTitle>Withdraw commitment</DialogTitle>
          <DialogDescription>
            {invoiceTitle ? `${invoiceTitle} — ` : ""}review the exit fee and your refund before confirming.
          </DialogDescription>
        </DialogHeader>

        {preview.isLoading ? (
          <div className="space-y-2" data-testid="exit-preview-loading">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : preview.isError || !data ? (
          <div
            className="space-y-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm"
            role="alert"
            data-testid="exit-preview-error"
          >
            <p className="text-destructive">
              {preview.error instanceof Error && preview.error.message
                ? preview.error.message
                : "Could not load the exit fee preview."}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => preview.refetch()}
              disabled={preview.isFetching}
              data-testid="exit-preview-retry"
            >
              <RefreshCw className={`mr-1 h-3.5 w-3.5 ${preview.isFetching ? "animate-spin" : ""}`} />
              Retry
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <ExitFeeBreakdown preview={data} />
            <FeeTrendHint preview={data} />
            {preview.isFetching && (
              <p className="text-xs text-muted-foreground" data-testid="exit-preview-refreshing">
                Refreshing preview…
              </p>
            )}
            {highFee && (
              <label
                className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm"
                data-testid="exit-high-fee-ack"
              >
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  data-testid="exit-high-fee-checkbox"
                />
                <span>
                  <AlertTriangle className="mr-1 inline h-3.5 w-3.5 text-amber-600" />
                  I understand the exit fee is above {HIGH_EXIT_FEE_PERCENT}% and I will receive{" "}
                  {data.net_refund.toLocaleString(undefined, { maximumFractionDigits: 7 })} XLM.
                </span>
              </label>
            )}
          </div>
        )}

        {withdraw.isError && (
          <p className="text-sm text-destructive" role="alert" data-testid="withdraw-commitment-error">
            {withdraw.error instanceof Error ? withdraw.error.message : "Withdrawal failed"}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!canConfirm}
            onClick={handleConfirm}
            data-testid="withdraw-commitment-confirm"
          >
            {withdraw.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Confirm withdrawal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
