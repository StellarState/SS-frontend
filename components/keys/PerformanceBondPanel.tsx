"use client";

import { Info } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PerformanceBondPanelProps {
  bondAmount: number;
  bondState: "staked" | "released" | "forfeited";
  maturityMilestone?: string;
  forfeitedReason?: string;
  releasedTimestamp?: string;
}

const bondStateConfig = {
  staked: {
    label: "Staked",
    variant: "default" as const,
    description: "Bond is currently locked and guarantees creator performance",
  },
  released: {
    label: "Released",
    variant: "secondary" as const,
    description: "Bond has been released to the creator",
  },
  forfeited: {
    label: "Forfeited",
    variant: "destructive" as const,
    description: "Bond was forfeited due to performance failure",
  },
};

export function PerformanceBondPanel({
  bondAmount,
  bondState,
  maturityMilestone,
  forfeitedReason,
  releasedTimestamp,
}: PerformanceBondPanelProps) {
  if (bondAmount <= 0) {
    return null;
  }

  const config = bondStateConfig[bondState];
  const formattedDate = releasedTimestamp
    ? new Date(releasedTimestamp).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Performance Bond</h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    The performance bond guarantees that the creator will
                    maintain key performance standards. If standards are not met,
                    the bond may be forfeited.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Badge variant={config.variant}>{config.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Bond Amount</span>
            <span className="text-lg font-semibold">
              ${bondAmount.toLocaleString()}
            </span>
          </div>

          {maturityMilestone && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Maturity Milestone
              </span>
              <span className="text-sm font-medium">{maturityMilestone}</span>
            </div>
          )}

          {releasedTimestamp && formattedDate && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Released Date</span>
              <span className="text-sm font-medium">{formattedDate}</span>
            </div>
          )}
        </div>

        {bondState === "staked" && (
          <div className="rounded-md bg-blue-50 dark:bg-blue-950 px-3 py-2 text-sm">
            <p className="text-blue-900 dark:text-blue-100">
              This bond is actively protecting investor interests. It will be
              released upon reaching the maturity milestone.
            </p>
          </div>
        )}

        {bondState === "released" && (
          <div className="rounded-md bg-green-50 dark:bg-green-950 px-3 py-2 text-sm">
            <p className="text-green-900 dark:text-green-100">
              The creator has met all performance requirements. The bond was
              released on {formattedDate}.
            </p>
          </div>
        )}

        {bondState === "forfeited" && forfeitedReason && (
          <div className="rounded-md bg-red-50 dark:bg-red-950 px-3 py-2 text-sm">
            <p className="font-medium text-red-900 dark:text-red-100 mb-1">
              Bond Forfeited
            </p>
            <p className="text-red-700 dark:text-red-200 text-xs">
              {forfeitedReason}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
