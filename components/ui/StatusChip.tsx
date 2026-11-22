"use client";

import { AlertCircle, CheckCircle2, Circle, Info, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Status cue for #651: every status carries an icon AND a text label so its
 * meaning never depends on color alone, in any palette.
 */

export type StatusVariant = "success" | "danger" | "warning" | "info" | "neutral";

const VARIANTS: Record<StatusVariant, { Icon: LucideIcon; label: string; className: string }> = {
  success: {
    Icon: CheckCircle2,
    label: "Success",
    className: "border-green-700 bg-green-50 text-green-900 dark:bg-green-950",
  },
  danger: {
    Icon: XCircle,
    label: "Failed",
    className: "border-red-700 bg-red-50 text-red-900 dark:bg-red-950",
  },
  warning: {
    Icon: AlertCircle,
    label: "Warning",
    className: "border-amber-700 bg-amber-50 text-amber-900 dark:bg-amber-950",
  },
  info: {
    Icon: Info,
    label: "In progress",
    className: "border-blue-700 bg-blue-50 text-blue-900 dark:bg-blue-950",
  },
  neutral: {
    Icon: Circle,
    label: "Pending",
    className: "border-slate-600 bg-slate-100 text-slate-900 dark:bg-slate-800",
  },
};

export interface StatusChipProps {
  variant: StatusVariant;
  /** Specific status text; falls back to a human label for the variant. */
  label?: string;
  className?: string;
}

export function StatusChip({ variant, label, className }: StatusChipProps) {
  const { Icon, label: fallback, className: variantClass } = VARIANTS[variant];
  return (
    <span
      data-testid="status-chip"
      data-variant={variant}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        variantClass,
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      <span>{label ?? fallback}</span>
    </span>
  );
}
