"use client";

import { Check } from "lucide-react";
import { usePreferences } from "@/context/PreferencesContext";
import { DENSITIES, TEXT_SIZES, type Density, type TextSize } from "@/lib/preferences";
import { cn } from "@/lib/utils";
import { PaletteSelector } from "./PaletteSelector";

const DENSITY_LABELS: Record<Density, string> = {
  comfortable: "Comfortable",
  compact: "Compact",
  spacious: "Spacious",
};

const TEXT_SIZE_LABELS: Record<TextSize, string> = {
  "90": "90%",
  "100": "100%",
  "115": "115%",
  "130": "130%",
};

interface OptionGroupProps<T extends string> {
  label: string;
  options: readonly T[];
  labels: Record<T, string>;
  value: T;
  onChange: (value: T) => void;
  testId: string;
}

function OptionGroup<T extends string>({
  label,
  options,
  labels,
  value,
  onChange,
  testId,
}: OptionGroupProps<T>) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2" data-testid={testId}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm",
              value === option
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background hover:bg-accent",
            )}
          >
            {value === option && <Check aria-hidden="true" className="size-3.5" />}
            {labels[option]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** #650 + #651: density, text size and palette controls with a live preview. */
export function DisplayPreferences() {
  const { preferences, setDensity, setTextSize } = usePreferences();

  return (
    <section id="display" className="space-y-5 rounded-lg border p-4" data-testid="display-preferences">
      <div>
        <h2 className="text-lg font-semibold">Display</h2>
        <p className="text-sm text-muted-foreground">
          Density, text size and color palette apply across the whole app.
        </p>
      </div>

      <OptionGroup
        label="Density"
        options={DENSITIES}
        labels={DENSITY_LABELS}
        value={preferences.density}
        onChange={setDensity}
        testId="density-options"
      />
      <OptionGroup
        label="Text size"
        options={TEXT_SIZES}
        labels={TEXT_SIZE_LABELS}
        value={preferences.textSize}
        onChange={setTextSize}
        testId="text-size-options"
      />
      <PaletteSelector />

      <div
        data-testid="display-preview"
        data-density={preferences.density}
        data-text-size={preferences.textSize}
        data-palette={preferences.palette}
        className="density-card space-y-2 rounded-md border bg-card text-card-foreground"
      >
        <p className="text-sm font-semibold">Live preview</p>
        <div className="density-row flex items-center justify-between rounded bg-muted px-2">
          <span className="text-sm">Available balance</span>
          <span className="text-sm font-medium">1,240.00 USDC</span>
        </div>
        <div className="density-row flex items-center justify-between rounded bg-muted px-2">
          <span className="text-sm">Invoice #1042</span>
          <span className="text-sm font-medium">Funded</span>
        </div>
      </div>
    </section>
  );
}
