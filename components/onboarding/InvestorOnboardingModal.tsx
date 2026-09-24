"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Step = "overview" | "risk" | "accreditation" | "confirm";
const STEPS: Step[] = ["overview", "risk", "accreditation", "confirm"];
const ONBOARDING_KEY = "ss-investor-onboarded";
const TERMS_KEY = "ss-terms-version";
const TERMS_V = "1.0";

function isOnboarded() { if (typeof window === "undefined") return false; return localStorage.getItem(ONBOARDING_KEY) === "true" && localStorage.getItem(TERMS_KEY) === TERMS_V; }

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEPS.map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${i < current ? "bg-green-500 text-white" : i === current ? "border-2 border-primary text-primary" : "border border-muted-foreground/30 text-muted-foreground"}`}>{i < current ? "✓" : i + 1}</div>
          {i < STEPS.length - 1 && <div className="h-px w-4 bg-muted-foreground/20" />}
        </div>
      ))}
    </div>
  );
}

export function InvestorOnboardingModal({ onComplete }: { onComplete?: () => void }) {
  const [step, setStep] = useState(0);
  const [ack, setAck] = useState({ risks: false, accreditation: false });
  const markComplete = useMutation({ mutationFn: async () => { localStorage.setItem(ONBOARDING_KEY, "true"); localStorage.setItem(TERMS_KEY, TERMS_V); }, onSuccess: () => onComplete?.() });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader><CardTitle>Investor Onboarding</CardTitle><StepIndicator current={step} /></CardHeader>
        <CardContent className="space-y-4">
          {STEPS[step] === "overview" && (
            <div className="space-y-3 text-sm">
              <h3 className="font-semibold text-base">Welcome to StellarState</h3>
              <p>StellarState is a decentralized invoice factoring platform built on Stellar.</p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground"><li>Investments in XLM against real-world invoices</li><li>Returns depend on successful settlement</li><li>Funds locked until maturity or settlement</li><li>Smart contract risk exists</li></ul>
            </div>
          )}
          {STEPS[step] === "risk" && (
            <div className="space-y-3 text-sm">
              <h3 className="font-semibold text-base">Risk Disclosure</h3>
              <div className="rounded-md bg-amber-50 p-3 text-amber-800 text-xs">This is not financial advice. Invest only what you can afford to lose.</div>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground"><li><strong>Credit risk:</strong> Debtor may default</li><li><strong>Liquidity risk:</strong> Funds locked until settlement</li><li><strong>Smart contract risk:</strong> Bugs could affect funds</li><li><strong>Market risk:</strong> XLM price volatility</li></ul>
              <label className="flex items-center gap-2 mt-4 cursor-pointer"><input type="checkbox" checked={ack.risks} onChange={(e) => setAck({ ...ack, risks: e.target.checked })} className="h-4 w-4" /><span className="text-sm font-medium">I have read and understood the risks</span></label>
            </div>
          )}
          {STEPS[step] === "accreditation" && (
            <div className="space-y-3 text-sm">
              <h3 className="font-semibold text-base">Accreditation Acknowledgement</h3>
              <p>By proceeding, you confirm:</p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground"><li>You meet accredited investor qualifications</li><li>You understand this is speculative</li><li>You have conducted your own due diligence</li></ul>
              <label className="flex items-center gap-2 mt-4 cursor-pointer"><input type="checkbox" checked={ack.accreditation} onChange={(e) => setAck({ ...ack, accreditation: e.target.checked })} className="h-4 w-4" /><span className="text-sm font-medium">I acknowledge my accreditation status</span></label>
            </div>
          )}
          {STEPS[step] === "confirm" && (
            <div className="space-y-3 text-sm text-center"><h3 className="font-semibold text-base">You&apos;re All Set</h3><p className="text-muted-foreground">You can now invest in invoices on StellarState.</p></div>
          )}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>Back</Button>
            {step < STEPS.length - 1 ? <Button onClick={() => setStep(step + 1)} disabled={step === 1 && !ack.risks}>Next</Button> : <Button onClick={() => markComplete.mutate()} disabled={!ack.risks || !ack.accreditation}>Start Investing</Button>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export { isOnboarded };
