"use client";

/**
 * Keyboard skip links (issue #652).
 *
 * Rendered before every other interactive element so the first Tab stop on
 * any route is a visible link to the main content. Links stay visually hidden
 * until focused, then appear at the top left of the viewport.
 */

export const MAIN_CONTENT_ID = "main-content";
export const PRIMARY_NAV_ID = "primary-navigation";

const LINKS = [
  { href: `#${MAIN_CONTENT_ID}`, label: "Skip to main content" },
  { href: `#${PRIMARY_NAV_ID}`, label: "Skip to navigation" },
];

function focusTarget(href: string) {
  const target = document.getElementById(href.slice(1));
  if (!target) return;
  if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
}

export function SkipLinks() {
  return (
    <nav aria-label="Skip links" data-testid="skip-links">
      {LINKS.map(({ href, label }) => (
        <a
          key={href}
          href={href}
          onClick={() => focusTarget(href)}
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:ring-2 focus:ring-ring"
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
