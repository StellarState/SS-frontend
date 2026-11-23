"use client";

import { useFundingPace } from "@/hooks/useFundingPace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, TrendingUp } from "lucide-react";
import { Money } from "@/components/currency";

interface FundingPaceChartProps {
  invoiceId: string;
}

export function FundingPaceChart({ invoiceId }: FundingPaceChartProps) {
  const { data, isLoading, error } = useFundingPace(invoiceId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Funding Pace</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Funding Pace</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Unable to load funding pace data
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data.hasEnoughData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Funding Pace</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Not enough data to project completion
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusColors = {
    "on-track": "bg-green-100 text-green-800",
    "at-risk": "bg-yellow-100 text-yellow-800",
    unlikely: "bg-red-100 text-red-800",
  };

  const completionDate = new Date(data.projectedCompletionDate * 1000);
  const daysRemaining = Math.ceil(
    (data.projectedCompletionDate - Date.now() / 1000) / 86400
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Funding Pace</CardTitle>
          <Badge className={statusColors[data.status]}>
            {data.status === "on-track" && "On Track"}
            {data.status === "at-risk" && "At Risk"}
            {data.status === "unlikely" && "Unlikely"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-1">
              Current Rate
            </div>
            <div className="text-2xl font-bold">
              <Money amount={data.recentRate} decimals={2} /> /day
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-1">
              Target
            </div>
            <div className="text-2xl font-bold">
              <Money amount={data.targetAmount} decimals={0} />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Projected Completion</div>
          <div className="text-lg font-semibold">
            {completionDate.toLocaleDateString()}
          </div>
          <div className="text-sm text-muted-foreground">
            {daysRemaining > 0
              ? `${daysRemaining} days remaining`
              : "Deadline passed"}
          </div>
        </div>

        {data.status === "at-risk" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div>
                <div className="font-medium text-sm">At Risk</div>
                <div className="text-sm text-yellow-700">
                  Consider increasing the advance rate or extending the deadline
                </div>
              </div>
            </div>
          </div>
        )}

        {data.status === "unlikely" && (
          <div className="bg-red-50 border border-red-200 rounded p-4 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
              <div>
                <div className="font-medium text-sm">Unlikely to Complete</div>
                <div className="text-sm text-red-700">
                  Current funding rate will not reach the target by the deadline
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-muted rounded h-64" />
      </CardContent>
    </Card>
  );
}
