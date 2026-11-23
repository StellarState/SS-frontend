"use client";

/**
 * Experiment framework (#756): consistent variant assignment, one exposure
 * event per session per experiment, and conversion tracking. With analytics
 * consent off, every experiment shows its control and no events are sent.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";
import { assignVariant, controlOf, CONTROL, type ExperimentConfig } from "@/lib/experiments";

export type ExperimentEvent =
  | { type: "exposure"; experiment: string; variant: string }
  | { type: "conversion"; experiment: string; variant: string; event: string };

interface ExperimentContextValue {
  getVariant: (name: string) => string;
  exposed: (name: string) => void;
  trackConversion: (name: string, event: string) => void;
}

const EXPOSURE_KEY = "ss.experiments.exposed";

function markExposed(name: string): boolean {
  try {
    const seen: string[] = JSON.parse(sessionStorage.getItem(EXPOSURE_KEY) ?? "[]");
    if (seen.includes(name)) return false;
    sessionStorage.setItem(EXPOSURE_KEY, JSON.stringify([...seen, name]));
  } catch {
    // Storage unavailable: still record, at worst once per page load.
  }
  return true;
}

const ExperimentContext = createContext<ExperimentContextValue>({
  getVariant: () => CONTROL,
  exposed: () => {},
  trackConversion: () => {},
});

export function ExperimentProvider({
  experiments,
  subjectId,
  consent,
  onEvent,
  children,
}: {
  /** Active experiments, e.g. from the config endpoint. */
  experiments: ExperimentConfig[];
  /** Signed-in user id, or a persisted anonymous id. */
  subjectId: string;
  /** Analytics consent. Off ⇒ control everywhere and no events. */
  consent: boolean;
  onEvent: (event: ExperimentEvent) => void;
  children: ReactNode;
}) {
  const value = useMemo<ExperimentContextValue>(() => {
    const byName = new Map(experiments.map((e) => [e.name, e]));
    const getVariant = (name: string) =>
      consent ? assignVariant(byName.get(name), subjectId) : controlOf(byName.get(name));
    return {
      getVariant,
      exposed: (name) => {
        if (consent && byName.has(name) && markExposed(name)) {
          onEvent({ type: "exposure", experiment: name, variant: getVariant(name) });
        }
      },
      trackConversion: (name, event) => {
        if (consent && byName.has(name)) {
          onEvent({ type: "conversion", experiment: name, variant: getVariant(name), event });
        }
      },
    };
  }, [experiments, subjectId, consent, onEvent]);

  return <ExperimentContext.Provider value={value}>{children}</ExperimentContext.Provider>;
}

/** Assigned variant for `name`; records the exposure once per session. */
export function useExperiment(name: string): string {
  const { getVariant, exposed } = useContext(ExperimentContext);
  useEffect(() => exposed(name), [exposed, name]);
  return getVariant(name);
}

export function useTrackConversion(): (name: string, event: string) => void {
  const { trackConversion } = useContext(ExperimentContext);
  return useCallback((name, event) => trackConversion(name, event), [trackConversion]);
}

/** Renders the child keyed by the assigned variant, or `fallback`. */
export function Variant({
  experiment,
  variants,
  fallback = null,
}: {
  experiment: string;
  variants: Record<string, ReactNode>;
  fallback?: ReactNode;
}) {
  const assigned = useExperiment(experiment);
  return <>{variants[assigned] ?? fallback}</>;
}
