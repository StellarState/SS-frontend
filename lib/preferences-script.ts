import {
  DEFAULT_PREFERENCES,
  DENSITIES,
  PALETTES,
  PREFERENCES_STORAGE_KEY,
  TEXT_SIZES,
  type Density,
  type Palette,
  type TextSize,
} from "./preferences";

/**
 * Builds the blocking script inserted in <head> so preferences are applied
 * before first paint (no layout shift). Kept as a pure builder so it can be
 * unit tested without a browser; the values are duplicated from preferences.ts
 * deliberately to keep the critical path free of module loading.
 */
export function buildPreferencesScript(): string {
  return `(function(){
  var d=${JSON.stringify(DEFAULT_PREFERENCES.density)},
      t=${JSON.stringify(DEFAULT_PREFERENCES.textSize)},
      p=${JSON.stringify(DEFAULT_PREFERENCES.palette)};
  try {
    var raw = localStorage.getItem(${JSON.stringify(PREFERENCES_STORAGE_KEY)});
    if (raw) {
      var saved = JSON.parse(raw);
      if (${JSON.stringify(DENSITIES)}.indexOf(saved.density) !== -1) d = saved.density;
      if (${JSON.stringify(TEXT_SIZES)}.indexOf(saved.textSize) !== -1) t = saved.textSize;
      if (${JSON.stringify(PALETTES)}.indexOf(saved.palette) !== -1) p = saved.palette;
    }
  } catch (e) {}
  var root = document.documentElement;
  root.setAttribute('data-density', d);
  root.setAttribute('data-text-size', t);
  root.setAttribute('data-palette', p);
  root.style.fontSize = t + '%';
})();`;
}

// Type-only imports keep the builder's emitted script free of runtime deps.
export type { Density, Palette, TextSize };
