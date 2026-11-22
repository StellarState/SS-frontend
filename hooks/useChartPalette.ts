"use client";

import { useEffect, useState } from "react";
import { getSeriesCue, type SeriesCue } from "@/lib/palette";
import { PALETTES, PREFERENCES_STORAGE_KEY, parsePreferences, type Palette } from "@/lib/preferences";

/**
 * Non-color cues for chart series (#651). Reads the palette from the html
 * attribute so it works for charts rendered outside the preferences provider
 * too, and follows both preference changes and cross-tab updates.
 */
export function useChartPalette(count = 4): SeriesCue[] {
  const [palette, setPalette] = useState<Palette>("default");

  useEffect(() => {
    const read = () => {
      const attribute = document.documentElement.getAttribute("data-palette");
      const next = PALETTES.includes(attribute as Palette)
        ? (attribute as Palette)
        : parsePreferences(window.localStorage?.getItem(PREFERENCES_STORAGE_KEY)).palette;
      setPalette(next);
    };
    read();

    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-palette"],
    });
    window.addEventListener("storage", read);
    return () => {
      observer.disconnect();
      window.removeEventListener("storage", read);
    };
  }, []);

  return Array.from({ length: count }, (_, index) => getSeriesCue(index, palette));
}
