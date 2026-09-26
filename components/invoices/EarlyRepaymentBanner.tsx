"use client";

import { useState } from "react";
import { AlertCircle, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface EarlyRepaymentBannerProps {
  amount: number;
  originalMaturityDate: string;
  newSettlementDate: string;
}

export function EarlyRepaymentBanner({
  amount,
  originalMaturityDate,
  newSettlementDate,
}: EarlyRepaymentBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800">
      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertDescription className="flex-1">
        <div className="font-medium text-amber-900 dark:text-amber-100 mb-1">
          Early Repayment Notice
        </div>
        <div className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
          <div>
            <span className="font-medium">Repayment Amount:</span>{" "}
            {amount.toLocaleString()} XLM
          </div>
          <div>
            <span className="font-medium">Original Maturity:</span>{" "}
            {new Date(originalMaturityDate).toLocaleDateString()}
          </div>
          <div>
            <span className="font-medium">New Settlement Date:</span>{" "}
            {new Date(newSettlementDate).toLocaleDateString()}
          </div>
        </div>
      </AlertDescription>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 ml-2"
        onClick={() => setDismissed(true)}
      >
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  );
}
