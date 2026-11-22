"use client";

/**
 * Route focus and announcement (issue #652).
 *
 * Focus moves to the new page's h1 on client-side navigation, after the page
 * has set document.title. The first render is skipped so loading a page does
 * not steal focus from the browser's initial position.
 */

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MAIN_CONTENT_ID } from "./SkipLinks";

export function RouteFocus() {
  const pathname = usePathname();
  const isFirstRender = useRef(true);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const main = document.querySelector<HTMLElement>("main");

    // The main landmark must be targetable from the very first render,
    // otherwise the first Tab's "Skip to main content" link goes nowhere.
    if (main) {
      main.id = MAIN_CONTENT_ID;
      if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
    }

    // The initial load keeps the browser's own focus position. Only client
    // side route changes move focus and announce the new page title.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!main) return;

    const heading = main.querySelector<HTMLElement>("h1") ?? main;
    if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
    setAnnouncement(`Navigated to ${document.title}`);
  }, [pathname]);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
      data-testid="route-announcement"
    >
      {announcement}
    </div>
  );
}
