"use client";

import { Badge } from "@/components/ui/badge";

export type InvoiceStatus = "draft" | "published" | "funded" | "settled" | "expired" | "active";

interface InvoiceStatusBadgeProps {
    status?: InvoiceStatus | string | null;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link" }> = {
    draft: { label: "Draft", variant: "secondary" },
    published: { label: "Open", variant: "outline" },
    open: { label: "Open", variant: "outline" },
    active: { label: "Active", variant: "outline" },
    funded: { label: "Funded", variant: "default" },
    settled: { label: "Settled", variant: "ghost" },
    expired: { label: "Expired", variant: "destructive" },
};

export function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
    if (status === null || status === undefined) {
        return null;
    }

    const config = statusConfig[status] ?? { label: "Unknown", variant: "secondary" as const };

    return <Badge variant={config.variant}>{config.label}</Badge>;
}