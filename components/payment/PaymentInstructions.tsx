"use client";

import { useMemo } from "react";
import QRCode from "react-qr-code";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyButton } from "./CopyButton";
import { PaymentCountdown } from "./PaymentCountdown";
import { PaymentStatusTracker } from "./PaymentStatusTracker";
import { usePaymentInstructions } from "@/hooks/usePaymentInstructions";
import { buildPaymentUri, formatPaymentAmount, totalDue } from "@/lib/paymentUri";

const FAILURE_MESSAGE = {
  invalid: "This payment link is invalid or has already been used.",
  expired: "This payment link has expired. Request a new confirmation email.",
  unavailable: "Payment instructions are temporarily unavailable.",
} as const;

/** Public payment page body for /pay/:token. */
export function PaymentInstructions({ token }: { token: string }) {
  const { data, isLoading } = usePaymentInstructions(token);

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="payment-loading">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!data?.ok) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-6 text-center" role="alert" data-testid="payment-error">
        <h2 className="text-lg font-semibold">Cannot show payment instructions</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {FAILURE_MESSAGE[data?.failure ?? "unavailable"]}
        </p>
      </div>
    );
  }

  const { instructions } = data;
  return <PaymentDetails token={token} instructions={instructions} />;
}

function PaymentDetails({
  token,
  instructions,
}: {
  token: string;
  instructions: {
    amountDue: number;
    lateInterest: number;
    destination: string;
    memo: string;
    dueAt: string;
    stages: { received: boolean; matched: boolean; settled: boolean };
  };
}) {
  const due = totalDue(instructions.amountDue, instructions.lateInterest);
  const paymentUri = useMemo(
    () => buildPaymentUri(instructions.destination, due, instructions.memo),
    [instructions.destination, instructions.memo, due]
  );
  const overdue = instructions.lateInterest > 0;

  return (
    <div className="grid gap-6 md:grid-cols-2" data-testid="payment-instructions">
      <Card>
        <CardHeader>
          <CardTitle>Amount due</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-3xl font-bold tabular-nums" data-testid="payment-amount">
            {formatPaymentAmount(due)} XLM
          </p>
          {overdue && (
            <p className="rounded-md border border-amber-500/50 bg-amber-500/10 p-2 text-sm text-amber-700" role="alert" data-testid="payment-overdue-interest">
              Include {formatPaymentAmount(instructions.lateInterest)} XLM of overdue interest.
            </p>
          )}
          <div>
            <p className="text-xs text-muted-foreground">Due in</p>
            <PaymentCountdown dueAt={instructions.dueAt} />
          </div>
          <div className="rounded-md border bg-muted/40 p-3 text-sm" data-testid="payment-memo-warning">
            <p className="font-medium">The memo is required</p>
            <p className="text-muted-foreground">
              Payments without this memo cannot be matched to your invoice and may be returned.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Send payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center rounded-md bg-white p-4" data-testid="payment-qr">
            <QRCode value={paymentUri} size={160} />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Destination</p>
            <div className="flex items-center justify-between gap-2">
              <code className="break-all text-xs" data-testid="payment-destination">{instructions.destination}</code>
              <CopyButton value={instructions.destination} label="destination" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Memo</p>
            <div className="flex items-center justify-between gap-2">
              <code className="break-all text-xs" data-testid="payment-memo">{instructions.memo}</code>
              <CopyButton value={instructions.memo} label="memo" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground" data-testid="payment-token">{token}</p>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Payment progress</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentStatusTracker stages={instructions.stages} />
        </CardContent>
      </Card>
    </div>
  );
}
