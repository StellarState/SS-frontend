"use client";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useYieldAccrual } from "@/hooks/useYieldAccrual";

interface AccrualMeterProps {
  invoiceId: string;
}

function formatXlm(amount: number): string {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function AccrualMeter({ invoiceId }: AccrualMeterProps) {
  const accrual = useYieldAccrual(invoiceId);

  if (!accrual) return null;

  const { accruedAmount, projectedTotal, progressPct, isOverdue, lateInterest } =
    accrual;

  return (
    <div className="space-y-1" data-testid="accrual-meter">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-default underline decoration-dotted">
              Accrued yield
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-xs">
            Accrued yield is estimated and not yet payable
          </TooltipContent>
        </Tooltip>
        <span className="font-medium tabular-nums text-foreground">
          {formatXlm(accruedAmount)} XLM
        </span>
      </div>
      <Progress value={progressPct} className="h-1.5" />
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>of {formatXlm(projectedTotal)} XLM projected</span>
        <span>{progressPct.toFixed(0)}%</span>
      </div>
      {isOverdue && lateInterest > 0 && (
        <div className="flex items-center gap-1.5 pt-0.5">
          <Badge variant="destructive" className="text-xs px-1.5 py-0">
            Overdue
          </Badge>
          <span className="text-xs text-muted-foreground">
            Late interest: {formatXlm(lateInterest)} XLM
          </span>
        </div>
      )}
    </div>
  );
}
