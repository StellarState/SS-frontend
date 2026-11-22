"use client";
import { Badge } from "@/components/ui/badge";
import type { AckStatus } from "@/hooks/useDebtorAck";

const ACK_CONFIG: Record<
  AckStatus,
  { label: string; className: string }
> = {
  acknowledged: {
    label: "Acknowledged",
    className: "bg-green-100 text-green-800",
  },
  pending: {
    label: "Pending acknowledgement",
    className: "bg-yellow-100 text-yellow-800",
  },
  not_required: {
    label: "Not required",
    className: "bg-gray-100 text-gray-700",
  },
  revoked: {
    label: "Revoked",
    className: "bg-red-100 text-red-800",
  },
};

interface AckStatusBadgeProps {
  status: AckStatus;
}

export function AckStatusBadge({ status }: AckStatusBadgeProps) {
  const cfg = ACK_CONFIG[status] ?? ACK_CONFIG.not_required;
  return (
    <Badge className={cfg.className} data-testid="ack-status-badge">
      {cfg.label}
    </Badge>
  );
}
