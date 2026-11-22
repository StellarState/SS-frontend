"use client";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare, Square } from "lucide-react";

const CHECKLIST_KEY = "tipz_sandbox_checklist";

interface ChecklistState {
  fundInvoice: boolean;
  trackPosition: boolean;
  claimPayout: boolean;
}

const STEPS: { key: keyof ChecklistState; label: string }[] = [
  { key: "fundInvoice", label: "Fund a practice invoice" },
  { key: "trackPosition", label: "Track your position" },
  { key: "claimPayout", label: "Claim a practice payout" },
];

function readState(): ChecklistState {
  if (typeof window === "undefined") {
    return { fundInvoice: false, trackPosition: false, claimPayout: false };
  }
  try {
    const raw = localStorage.getItem(CHECKLIST_KEY);
    if (!raw) return { fundInvoice: false, trackPosition: false, claimPayout: false };
    return JSON.parse(raw) as ChecklistState;
  } catch {
    return { fundInvoice: false, trackPosition: false, claimPayout: false };
  }
}

export function SandboxChecklist() {
  const [checks, setChecks] = useState<ChecklistState>(readState);

  useEffect(() => {
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify(checks));
  }, [checks]);

  const toggle = useCallback((key: keyof ChecklistState) => {
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return (
    <Card data-testid="sandbox-checklist">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Practice Mode Checklist</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {STEPS.map((step) => {
          const checked = checks[step.key];
          return (
            <button
              key={step.key}
              type="button"
              className="flex w-full items-center gap-3 text-left text-sm"
              onClick={() => toggle(step.key)}
            >
              {checked ? (
                <CheckSquare className="size-5 shrink-0 text-green-600" />
              ) : (
                <Square className="size-5 shrink-0 text-muted-foreground" />
              )}
              <span className={checked ? "line-through text-muted-foreground" : ""}>
                {step.label}
              </span>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
