"use client";
/**
 * Cancel listing dialog for unfunded or partially funded invoices (#646).
 *
 * Shows investor count and estimated refund amount. The Cancel Listing button
 * is disabled when the invoice is already funded or settled, since those
 * states are irreversible.
 */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import type { Invoice } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

async function cancelInvoiceListing(invoiceId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/invoices/${invoiceId}/cancel`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to cancel listing");
}

interface CancelListingDialogProps {
  invoice: Pick<Invoice, "id" | "title" | "status" | "raised" | "investor_count">;
}

const BLOCKED_STATUSES: Invoice["status"][] = ["funded", "settled"];

export function CancelListingDialog({ invoice }: CancelListingDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const isBlocked = BLOCKED_STATUSES.includes(invoice.status);

  const mutation = useMutation({
    mutationFn: () => cancelInvoiceListing(invoice.id),
    onSuccess: () => {
      toast.success("Listing cancelled successfully");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["invoice", invoice.id] });
      queryClient.invalidateQueries({ queryKey: ["seller-dashboard"] });
    },
    onError: () => {
      toast.error("Failed to cancel listing. Please try again.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={isBlocked}>
          Cancel Listing
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" aria-hidden="true" />
            Cancel listing
          </DialogTitle>
          <DialogDescription>
            This will remove the invoice from the marketplace. Investors will be
            refunded.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md border p-4 space-y-3 bg-muted/40">
            <p className="font-medium text-sm">{invoice.title}</p>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>
                Investors:{" "}
                <span className="font-medium text-foreground">
                  {invoice.investor_count}
                </span>
              </span>
              <span>
                Amount to refund:{" "}
                <span className="font-medium text-foreground">
                  {invoice.raised.toLocaleString()} XLM
                </span>
              </span>
            </div>
          </div>

          {isBlocked && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                Cancellation is not available for{" "}
                <Badge variant="outline" className="text-xs">
                  {invoice.status}
                </Badge>{" "}
                invoices.
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Go back
          </Button>
          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={isBlocked || mutation.isPending}
          >
            {mutation.isPending ? "Cancelling…" : "Cancel Listing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
