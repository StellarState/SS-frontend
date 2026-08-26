"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Circle, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface OnboardingUserData {
  kycStatus: "pending" | "approved" | "rejected" | null;
  displayName: string | null;
  invoiceCount: number;
}

export interface OnboardingChecklistProps {
  data: OnboardingUserData;
}

const STORAGE_KEY = "onboarding_checklist_dismissed";

export function OnboardingChecklist({ data }: OnboardingChecklistProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (dismissed === "true") {
        setIsDismissed(true);
      }
    }
  }, []);

  const step1Complete = data.kycStatus === "pending" || data.kycStatus === "approved";
  const step2Complete = data.displayName !== null && data.displayName.trim() !== "";
  const step3Complete = data.invoiceCount >= 1;

  const allComplete = step1Complete && step2Complete && step3Complete;

  if (isDismissed || allComplete) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "true");
    }
  };

  return (
    <Card className="relative mb-6" data-testid="onboarding-checklist">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-bold">Getting Started Checklist</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={handleDismiss}
          aria-label="Dismiss checklist"
          data-testid="dismiss-checklist-btn"
        >
          <X className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3 text-sm" data-testid="checklist-step-1">
          {step1Complete ? (
            <CheckCircle2 className="size-5 text-green-500 shrink-0" data-testid="step-1-complete" />
          ) : (
            <Circle className="size-5 text-muted-foreground shrink-0" data-testid="step-1-incomplete" />
          )}
          <span className={step1Complete ? "line-through text-muted-foreground" : "font-medium"}>
            Complete Identity Verification (KYC)
          </span>
        </div>

        <div className="flex items-center gap-3 text-sm" data-testid="checklist-step-2">
          {step2Complete ? (
            <CheckCircle2 className="size-5 text-green-500 shrink-0" data-testid="step-2-complete" />
          ) : (
            <Circle className="size-5 text-muted-foreground shrink-0" data-testid="step-2-incomplete" />
          )}
          <span className={step2Complete ? "line-through text-muted-foreground" : "font-medium"}>
            Set your Display Name
          </span>
        </div>

        <div className="flex items-center gap-3 text-sm" data-testid="checklist-step-3">
          {step3Complete ? (
            <CheckCircle2 className="size-5 text-green-500 shrink-0" data-testid="step-3-complete" />
          ) : (
            <Circle className="size-5 text-muted-foreground shrink-0" data-testid="step-3-incomplete" />
          )}
          <span className={step3Complete ? "line-through text-muted-foreground" : "font-medium"}>
            Create your first invoice
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
