"use client";

import { useState, type FormEvent } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useDebtorConfirmation, useSubmitDebtorDecision } from "@/hooks/useDebtorConfirmation";
import {
  DEBTOR_TOKEN_MESSAGES,
  DebtorConfirmationError,
  validateRejectionReason,
  type DebtorTokenFailure,
} from "@/lib/debtorConfirmation";

const FAILURE_TITLES: Record<DebtorTokenFailure, string> = {
  expired: "Link expired",
  used: "Link already used",
  invalid: "Invalid link",
  unknown: "Something went wrong",
};

function formatDueDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC", // due dates are calendar dates; do not shift them into the viewer's zone
  });
}

function formatAmount(amount: string, currency: string): string {
  const num = Number(amount);
  if (Number.isNaN(num)) return `${amount} ${currency}`;
  return `${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

/**
 * Public landing page body for a debtor confirmation link (#574). Works
 * without a wallet or a login: the token in the link is the only credential.
 */
export function DebtorConfirmation({ token }: { token: string }) {
  const summaryQuery = useDebtorConfirmation(token);
  const submit = useSubmitDebtorDecision(token);

  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<"confirm" | "reject" | null>(null);

  if (completed) {
    return (
      <main className="container mx-auto max-w-lg px-4 py-8 text-center" data-testid="debtor-success">
        <h1 className="mb-4 text-2xl font-bold">
          {completed === "confirm" ? "Invoice confirmed" : "Invoice rejected"}
        </h1>
        <p className="text-muted-foreground">
          {completed === "confirm"
            ? "Thank you. Your confirmation has been recorded and the issuer has been notified."
            : "Thank you. Your rejection and reason have been recorded and the issuer has been notified."}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">You can close this page.</p>
        {completed === "confirm" && (
          <p className="mt-3">
            <a
              href={`/pay/${token}`}
              className="text-sm font-medium underline"
              data-testid="payment-instructions-link"
            >
              View payment instructions
            </a>
          </p>
        )}
      </main>
    );
  }

  if (summaryQuery.isPending) {
    return (
      <main className="container mx-auto max-w-lg px-4 py-8" aria-busy="true" data-testid="debtor-loading">
        <Skeleton className="mb-4 h-8 w-2/3" />
        <Skeleton className="h-48 w-full" />
      </main>
    );
  }

  if (summaryQuery.isError) {
    const kind: DebtorTokenFailure =
      summaryQuery.error instanceof DebtorConfirmationError ? summaryQuery.error.kind : "unknown";
    return (
      <main className="container mx-auto max-w-lg px-4 py-8">
        <Alert variant="destructive" data-testid={`debtor-token-${kind}`}>
          <AlertTitle>{FAILURE_TITLES[kind]}</AlertTitle>
          <AlertDescription>{DEBTOR_TOKEN_MESSAGES[kind]}</AlertDescription>
        </Alert>
        {kind === "unknown" && (
          <Button className="mt-4" variant="outline" onClick={() => summaryQuery.refetch()}>
            Try again
          </Button>
        )}
      </main>
    );
  }

  const summary = summaryQuery.data;

  const finish = (action: "confirm" | "reject") => setCompleted(action);

  const handleConfirm = () => {
    submit.mutate({ action: "confirm" }, { onSuccess: () => finish("confirm") });
  };

  const handleReject = (event: FormEvent) => {
    event.preventDefault();
    const problem = validateRejectionReason(reason);
    setReasonError(problem);
    if (problem) return;
    submit.mutate({ action: "reject", reason }, { onSuccess: () => finish("reject") });
  };

  const submitKind: DebtorTokenFailure | null =
    submit.error instanceof DebtorConfirmationError ? submit.error.kind : submit.isError ? "unknown" : null;

  return (
    <main className="container mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold">Confirm invoice</h1>

      <Card data-testid="debtor-summary">
        <CardHeader>
          <CardTitle>Invoice {summary.invoiceNumber}</CardTitle>
          <CardDescription>From {summary.issuerName}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Invoice number</dt>
            <dd>{summary.invoiceNumber}</dd>
            <dt className="text-muted-foreground">Issuer</dt>
            <dd>{summary.issuerName}</dd>
            <dt className="text-muted-foreground">Amount</dt>
            <dd>{formatAmount(summary.amount, summary.currency)}</dd>
            <dt className="text-muted-foreground">Due date</dt>
            <dd>{formatDueDate(summary.dueDate)}</dd>
            {summary.documentUrl && (
              <>
                <dt className="text-muted-foreground">Document</dt>
                <dd>
                  <a
                    href={summary.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    View invoice document
                  </a>
                </dd>
              </>
            )}
          </dl>
        </CardContent>
      </Card>

      {submitKind && (
        <Alert variant="destructive" className="mt-4" data-testid="debtor-submit-error">
          <AlertTitle>{FAILURE_TITLES[submitKind]}</AlertTitle>
          <AlertDescription>{DEBTOR_TOKEN_MESSAGES[submitKind]}</AlertDescription>
        </Alert>
      )}

      {rejecting ? (
        <form className="mt-6 space-y-3" onSubmit={handleReject} noValidate>
          <Label htmlFor="rejection-reason">Reason for rejection</Label>
          <Textarea
            id="rejection-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            aria-invalid={reasonError ? true : undefined}
            aria-describedby={reasonError ? "rejection-reason-error" : undefined}
            disabled={submit.isPending}
          />
          {reasonError && (
            <p id="rejection-reason-error" role="alert" className="text-sm text-destructive">
              {reasonError}
            </p>
          )}
          <div className="flex gap-3">
            <Button type="submit" variant="destructive" disabled={submit.isPending}>
              Submit rejection
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={submit.isPending}
              onClick={() => {
                setRejecting(false);
                setReasonError(null);
              }}
            >
              Back
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-6 flex gap-3">
          <Button onClick={handleConfirm} disabled={submit.isPending}>
            Confirm
          </Button>
          <Button variant="outline" onClick={() => setRejecting(true)} disabled={submit.isPending}>
            Reject
          </Button>
        </div>
      )}
    </main>
  );
}
