"use client";

import { Check } from "lucide-react";
import { usePreferences } from "@/context/PreferencesContext";
import { PALETTES, type Palette } from "@/lib/preferences";
import { cn } from "@/lib/utils";

const PALETTE_LABELS: Record<Palette, string> = {
  default: "Default",
  "high-contrast": "High contrast",
  "color-blind": "Color-blind safe",
};

const PALETTE_DESCRIPTIONS: Record<Palette, string> = {
  default: "The standard theme.",
  "high-contrast": "Stronger text and control contrast (4.5:1 or better).",
  "color-blind": "Blue/orange series with dashes and shapes.",
};

/** Palette mode selector for #651, persisted with the display preferences. */
export function PaletteSelector() {
  const { preferences, setPalette } = usePreferences();

  return (
    <fieldset className="space-y-2" data-testid="palette-options">
      <legend className="text-sm font-medium">Color palette</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {PALETTES.map((palette) => (
          <button
            key={palette}
            type="button"
            aria-pressed={preferences.palette === palette}
            onClick={() => setPalette(palette)}
            className={cn(
              "flex flex-col items-start rounded-md border p-2 text-left text-sm",
              preferences.palette === palette
                ? "border-primary bg-accent"
                : "hover:bg-accent/50",
            )}
          >
            <span className="flex items-center gap-1 font-medium">
              {preferences.palette === palette && <Check aria-hidden="true" className="size-3.5" />}
              {PALETTE_LABELS[palette]}
            </span>
            <span className="text-xs text-muted-foreground">{PALETTE_DESCRIPTIONS[palette]}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
