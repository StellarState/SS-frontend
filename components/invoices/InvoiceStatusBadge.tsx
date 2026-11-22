"use client";

import { useState } from "react";
import { StatusChip, type StatusVariant } from "@/components/ui/StatusChip";

export type InvoiceStatus = "draft" | "published" | "funded" | "settled" | "expired" | "active" | "rejected";

interface InvoiceStatusBadgeProps {
    status?: InvoiceStatus | string | null;
}

interface StatusConfig {
    label: string;
    variant: StatusVariant;
    tooltip: string;
}

const statusConfig: Record<string, StatusConfig> = {
    draft: { label: "Draft", variant: "neutral", tooltip: "This invoice has not been submitted for review yet" },
    published: { label: "Open", variant: "info", tooltip: "This invoice is open for investment" },
    open: { label: "Open", variant: "info", tooltip: "This invoice is open for investment" },
    active: { label: "Active", variant: "info", tooltip: "This invoice is open for investment" },
    funded: { label: "Funded", variant: "success", tooltip: "This invoice has reached its funding target" },
    settled: { label: "Settled", variant: "success", tooltip: "Investors have received their returns" },
    expired: { label: "Expired", variant: "danger", tooltip: "This invoice did not reach its funding target in time" },
    rejected: { label: "Rejected", variant: "danger", tooltip: "This invoice was rejected during review" },
    defaulted: { label: "Defaulted", variant: "danger", tooltip: "The seller defaulted on this invoice. Recovery distribution may be in progress." },
};

const unknownStatus: StatusConfig = {
    label: "Unknown",
    variant: "neutral",
    tooltip: "",
};

/** #651: status badge with an icon and label, not color alone. */
export function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
    const [showTooltip, setShowTooltip] = useState(false);

    if (status === null || status === undefined) {
        return null;
    }

    const config = statusConfig[status] ?? unknownStatus;

    return (
        <div className="relative inline-block">
            <div
                tabIndex={0}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onFocus={() => setShowTooltip(true)}
                onBlur={() => setShowTooltip(false)}
                className="cursor-help"
            >
                <StatusChip variant={config.variant} label={config.label} />
            </div>
            {showTooltip && config.tooltip && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded border border-input whitespace-nowrap pointer-events-none z-50">
                    {config.tooltip}
                </div>
            )}
        </div>
    );
}
