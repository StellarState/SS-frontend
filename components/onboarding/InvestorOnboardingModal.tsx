"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Step = "overview" | "risk" | "accreditation" | "confirm";

const STEPS: Step[] = ["overview", "risk", "accreditation", "confirm"];
const STEP_LABELS: Record<Step, string> = {
  overview: "Platform Overview",
  risk: "Risk Disclosure",
  accreditation: "Accreditation",
  confirm: "Confirmation",
};

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEPS.map((step, i) => (
        <div key={step} className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
              i < current ? "bg-green-500 text-white" : i === current ? "border-2 border-primary text-primary" : "border border-muted-foreground/30 text-muted-foreground"
            }`}
          >
            {i < current ? "✓" : i + 1}
          </div>
          {i < STEPS.length - 1 && <div className="h-px w-4 bg-muted-foreground/20" />}
        </div>
      ))}
    </div>
  );
}

const ONBOARDING_STORAGE_KEY = "ss-investor-onboarded";
const TERMS_VERSION_KEY = "ss-terms-version";
const CURRENT_TERMS_VERSION = "1.0";

function isOnboarded(): boolean {
  if (typeof window === "undefined") return false;
  const version = localStorage.getItem(TERMS_VERSION_KEY);
  return localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true" && version === CURRENT_TERMS_VERSION;
}

/**
 * #287 — First-time investor onboarding modal.
 * Blocks investment until platform rules, risk disclosure, and
 * accreditation acknowledgement are completed.
 */
export function InvestorOnboardingModal({ onComplete }: { onComplete?: () => void }) {
  const [step, setStep] = useState(0);
  const [acknowledged, setAcknowledged] = useState({
    risks: false,
    accreditation: false,
  });

  const markComplete = useMutation({
    mutationFn: async () => {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
      localStorage.setItem(TERMS_VERSION_KEY, CURRENT_TERMS_VERSION);
    },
    onSuccess: () => onComplete?.(),
  });

  const canConfirm = acknowledged.risks && acknowledged.accreditation;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Investor Onboarding</CardTitle>
          <StepIndicator current={step} />
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1: Overview */}
          {STEPS[step] === "overview" && (
            <div className="space-y-3 text-sm">
              <h3 className="font-semibold text-base">Welcome to StellarState</h3>
              <p>StellarState is a decentralized invoice factoring platform built on Stellar. Before you invest, please review the following:</p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Investments are made in XLM against real-world invoices</li>
                <li>Returns depend on successful invoice settlement</li>
                <li>Funds are locked until the invoice matures or is settled</li>
                <li>Smart contract risk exists — code is audited but not infallible</li>
              </ul>
            </div>
          )}

          {/* Step 2: Risk Disclosure */}
          {STEPS[step] === "risk" && (
            <div className="space-y-3 text-sm">
              <h3 className="font-semibold text-base">Risk Disclosure</h3>
              <div className="rounded-md bg-amber-50 p-3 text-amber-800 text-xs">
                This is not financial advice. Invest only what you can afford to lose.
              </div>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li><strong>Credit risk:</strong> The invoice debtor may default or delay payment</li>
                <li><strong>Liquidity risk:</strong> Your funds are locked until settlement or maturity</li>
                <li><strong>Smart contract risk:</strong> Bugs or exploits could affect funds</li>
                <li><strong>Regulatory risk:</strong> Laws may change affecting platform operations</li>
                <li><strong>Market risk:</strong> XLM price volatility affects USD-equivalent value</li>
              </ul>
              <label className="flex items-center gap-2 mt-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acknowledged.risks}
                  onChange={(e) => setAcknowledged({ ...acknowledged, risks: e.target.checked })}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">I have read and understood the risks</span>
              </label>
            </div>
          )}

          {/* Step 3: Accreditation */}
          {STEPS[step] === "accreditation" && (
            <div className="space-y-3 text-sm">
              <h3 className="font-semibold text-base">Accreditation Acknowledgement</h3>
              <p>By proceeding, you confirm that:</p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>You meet the qualifications of an accredited investor in your jurisdiction</li>
                <li>You understand this is a speculative investment</li>
                <li>You have conducted your own due diligence</li>
              </ul>
              <label className="flex items-center gap-2 mt-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acknowledged.accreditation}
                  onChange={(e) => setAcknowledged({ ...acknowledged, accreditation: e.target.checked })}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">I acknowledge and confirm my accreditation status</span>
              </label>
            </div>
          )}

          {/* Step 4: Confirm */}
          {STEPS[step] === "confirm" && (
            <div className="space-y-3 text-sm text-center">
              <h3 className="font-semibold text-base">You&apos;re All Set</h3>
              <p className="text-muted-foreground">You can now invest in invoices on StellarState. You can revisit these terms from your profile at any time.</p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep(step + 1)} disabled={step === 1 && !acknowledged.risks}>
                Next
              </Button>
            ) : (
              <Button onClick={() => markComplete.mutate()} disabled={!canConfirm}>
                {markComplete.isPending ? "Saving…" : "Start Investing"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** Hook-like check: returns true if the investor needs onboarding. */
export function useInvestorOnboardingNeeded(): boolean {
  return !isOnboarded();
}

export { isOnboarded, CURRENT_TERMS_VERSION };
