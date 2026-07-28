"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CountdownTimer, isExpired } from "@/components/marketplace";
import { useInvest } from "@/hooks/useInvestments";
import { fetchInvoice } from "@/lib/api";

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  open: "default",
  funded: "secondary",
  settled: "outline",
};

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const investMutation = useInvest();

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice", params.id],
    queryFn: () => fetchInvoice(params.id),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="text-muted-foreground">Invoice not found.</p>
      </div>
    );
  }

  const published = invoice.status === "open";
  const expired = isExpired(invoice.deadline);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Link
        href="/marketplace"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to marketplace
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle>{invoice.title}</CardTitle>
            <Badge variant={statusVariant[invoice.status]}>
              {invoice.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{invoice.description}</p>

          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">
              {invoice.amount.toLocaleString()} {invoice.currency}
            </span>
            <CountdownTimer deadline={invoice.deadline} published={published} />
          </div>

          <div className="text-sm text-muted-foreground">
            Seller: {invoice.sellerName}
          </div>

          <Button
            className="w-full"
            size="lg"
            disabled={!published || expired || investMutation.isPending}
            onClick={() =>
              investMutation.mutate({ invoiceId: invoice.id, amount: invoice.amount })
            }
          >
            {investMutation.isPending
              ? "Investing…"
              : expired
                ? "Expired"
                : "Invest Now"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
