"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Selection order used by the toggle: system -> light -> dark -> system.
 * `system` is the first entry so a fresh visitor keeps following the OS
 * preference until they explicitly opt out of it.
 */
const THEME_ORDER = ["system", "light", "dark"] as const;

type ThemeChoice = (typeof THEME_ORDER)[number];

const THEME_LABELS: Record<ThemeChoice, string> = {
  system: "System theme",
  light: "Light theme",
  dark: "Dark theme",
};

function isThemeChoice(value: string | undefined): value is ThemeChoice {
  return value !== undefined && (THEME_ORDER as readonly string[]).includes(value);
}

/**
 * Cycles the active theme between system, light and dark.
 *
 * `next-themes` resolves the value on the client only, so the first render is
 * intentionally rendered as the neutral `system` state. Rendering the resolved
 * icon server-side would produce a hydration mismatch (and a visible icon
 * flash), so the icon switches after mount instead.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const current: ThemeChoice = mounted && isThemeChoice(theme) ? theme : "system";
  const next = THEME_ORDER[(THEME_ORDER.indexOf(current) + 1) % THEME_ORDER.length];
  const Icon = current === "light" ? Sun : current === "dark" ? Moon : Monitor;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0"
      data-testid="theme-toggle"
      aria-label={`${THEME_LABELS[current]}. Switch to ${THEME_LABELS[next]}`}
      title={`${THEME_LABELS[current]}. Switch to ${THEME_LABELS[next]}`}
      onClick={() => setTheme(next)}
    >
      <Icon className="h-4 w-4" data-testid={`theme-toggle-icon-${current}`} />
    </Button>
  );
}
