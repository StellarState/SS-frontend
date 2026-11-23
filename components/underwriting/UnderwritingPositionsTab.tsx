"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useWallet } from "@/context/WalletContext";
import { useUnderwritingPositions } from "@/hooks/useUnderwriting";
import type { UnderwritingPositionStatus } from "@/lib/api";

const STATUS_LABEL: Record<UnderwritingPositionStatus, string> = {
  active: "Active",
  claimable: "Settled — release available",
  released: "Released",
  absorbed: "Loss absorbed",
};

const STATUS_VARIANT: Record<UnderwritingPositionStatus, "default" | "secondary" | "outline" | "destructive"> = {
  active: "default",
  claimable: "secondary",
  released: "outline",
  absorbed: "destructive",
};

/** Portfolio "Underwriting" tab: the user's cover positions and outcomes (#587). */
export function UnderwritingPositionsTab() {
  const { address } = useWallet();
  const { data, isLoading, isError } = useUnderwritingPositions(address);

  if (isLoading) {
    return (
      <div className="space-y-3" data-testid="underwriting-loading">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="py-8 text-center text-sm text-destructive" data-testid="underwriting-error">
        Could not load your underwriting positions.
      </p>
    );
  }

  if (!data || data.length === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground" data-testid="underwriting-empty">
        You have not underwritten any invoices yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border bg-card" data-testid="underwriting-list">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-muted/50 text-muted-foreground">
          <tr>
            <th className="p-3 font-medium">Invoice</th>
            <th className="p-3 font-medium">Staked</th>
            <th className="p-3 font-medium">Premium rate</th>
            <th className="p-3 font-medium">Premium earned</th>
            <th className="p-3 font-medium">Loss absorbed</th>
            <th className="p-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((pos) => (
            <tr key={pos.invoice_id} data-testid={`underwriting-row-${pos.invoice_id}`}>
              <td className="p-3 font-medium">
                <Link href={`/invoices/${encodeURIComponent(pos.invoice_id)}`} className="hover:underline">
                  {pos.invoice_title}
                </Link>
              </td>
              <td className="p-3">{pos.staked.toLocaleString()} XLM</td>
              <td className="p-3">{pos.premium_rate}%</td>
              <td className="p-3">{pos.premium_earned.toLocaleString()} XLM</td>
              <td className="p-3">
                {pos.loss_absorbed > 0 ? `${pos.loss_absorbed.toLocaleString()} XLM` : "—"}
              </td>
              <td className="p-3">
                <Badge variant={STATUS_VARIANT[pos.status]} data-testid={`underwriting-status-${pos.invoice_id}`}>
                  {STATUS_LABEL[pos.status]}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
