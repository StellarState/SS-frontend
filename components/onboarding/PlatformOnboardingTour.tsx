"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useWallet } from "@/context/WalletContext";
import { useIsKycApproved } from "@/hooks/useKycStatus";
import { useOnboardingTour } from "@/hooks/useOnboardingTour";

interface TourStep {
  id: string;
  /** Value of the `data-tour` attribute on the element this step points at. */
  target: string | null;
  title: string;
  description: string;
}

export const ONBOARDING_TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    target: null,
    title: "Welcome to StellarSettle",
    description:
      "Your wallet is connected. This short tour shows where to find invoices, how to invest and where to trade fractions.",
  },
  {
    id: "marketplace",
    target: "marketplace",
    title: "Browse the marketplace",
    description:
      "Open the marketplace to see tokenized invoices. Filter by sector and compare yields to find ones that fit your strategy.",
  },
  {
    id: "invoice-detail",
    target: "invoice-card",
    title: "Open an invoice",
    description:
      "Select an invoice to see its issuer, financials, documents and funding progress before you commit funds.",
  },
  {
    id: "invest-flow",
    target: "invest-button",
    title: "Invest in fractions",
    description:
      "On an open invoice, use Invest to choose an amount. The returns calculator shows your estimated yield first.",
  },
  {
    id: "portfolio",
    target: "portfolio",
    title: "Track your portfolio",
    description:
      "Your portfolio lists every position with its payouts and dividends, and what is due at maturity.",
  },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const SPOTLIGHT_PADDING = 6;
const CARD_WIDTH = 384;
const CARD_GAP = 12;

function findTarget(target: string | null): HTMLElement | null {
  if (!target) return null;
  const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  // Elements hidden at this breakpoint have no size; fall back to a centred card.
  return r.width > 0 && r.height > 0 ? el : null;
}

function measure(el: HTMLElement | null): Rect | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

/**
 * Cards sit below the target when there is room, otherwise above, and are
 * kept inside the viewport horizontally.
 */
function cardPosition(rect: Rect): { top: number; left: number } {
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const width = Math.min(CARD_WIDTH, viewportW - 32);
  const left = Math.min(Math.max(16, rect.left + rect.width / 2 - width / 2), viewportW - width - 16);
  const below = rect.top + rect.height + SPOTLIGHT_PADDING + CARD_GAP;
  const fitsBelow = below + 220 < viewportH;
  const top = fitsBelow ? below : Math.max(16, rect.top - SPOTLIGHT_PADDING - CARD_GAP - 220);
  return { top, left };
}

/**
 * Guided investor tour (#505). Starts on first wallet connection, highlights
 * the element each step refers to (centring the card when that element is not
 * on screen), and can be skipped from every step. Completion is stored in
 * localStorage; "Restart tour" in settings clears it and starts at step 1.
 */
export function PlatformOnboardingTour() {
  const { isConnected } = useWallet();
  const { isApproved, isLoading } = useIsKycApproved({ enabled: isConnected });
  const { isActive, currentStep, setCurrentStep, complete, skip } =
    useOnboardingTour(isConnected && !isLoading && isApproved);

  const step = ONBOARDING_TOUR_STEPS[Math.min(currentStep, ONBOARDING_TOUR_STEPS.length - 1)];
  const [rect, setRect] = useState<Rect | null>(null);

  const update = useCallback(() => setRect(measure(findTarget(step.target))), [step.target]);

  useLayoutEffect(() => {
    if (!isActive) return;
    findTarget(step.target)?.scrollIntoView({ block: "center", behavior: "auto" });
    update();
  }, [isActive, step.target, update]);

  useEffect(() => {
    if (!isActive) return;
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [isActive, update]);

  useEffect(() => {
    if (!isActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isActive, skip]);

  if (!isActive) return null;

  const isLast = currentStep === ONBOARDING_TOUR_STEPS.length - 1;
  const placed = rect ? cardPosition(rect) : null;

  const handleNext = () => {
    if (isLast) complete();
    else setCurrentStep((s) => s + 1);
  };

  return (
    <div
      className="fixed inset-0 z-[100]"
      data-testid="onboarding-tour"
      role="dialog"
      aria-modal="true"
      aria-label="Platform onboarding tour"
    >
      {rect ? (
        <div
          aria-hidden="true"
          data-testid={`onboarding-highlight-${step.id}`}
          className="pointer-events-none fixed rounded-md ring-2 ring-primary"
          style={{
            top: rect.top - SPOTLIGHT_PADDING,
            left: rect.left - SPOTLIGHT_PADDING,
            width: rect.width + SPOTLIGHT_PADDING * 2,
            height: rect.height + SPOTLIGHT_PADDING * 2,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
      )}

      <div
        className={
          placed ? "fixed" : "absolute inset-0 flex items-center justify-center p-4"
        }
        style={placed ? { top: placed.top, left: placed.left, width: Math.min(CARD_WIDTH, window.innerWidth - 32) } : undefined}
      >
        <Card className="w-full max-w-md" data-testid={`onboarding-step-${step.id}`}>
          <CardHeader>
            <p className="text-xs text-muted-foreground" data-testid="onboarding-step-count">
              Step {currentStep + 1} of {ONBOARDING_TOUR_STEPS.length}
            </p>
            <h2 className="text-lg font-semibold" data-testid="onboarding-step-title">
              {step.title}
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground" data-testid="onboarding-step-description">
              {step.description}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={skip}
                className="flex-1"
                data-testid="onboarding-skip"
              >
                Skip tour
              </Button>
              <Button onClick={handleNext} className="flex-1" data-testid="onboarding-next">
                {isLast ? "Finish" : "Next"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
