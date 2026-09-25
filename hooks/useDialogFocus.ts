"use client";

import { useEffect, useRef } from "react";

/**
 * Elements that can hold focus, plus the selectors that match everything
 * else focusable. `inert`/`hidden` subtrees are excluded by the browser's
 * own `focus()` behaviour, so they need no special handling here.
 */
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(
    (el) =>
      !el.hasAttribute("disabled") &&
      // `hidden` and aria-hidden mark content as removed from the a11y tree,
      // so it must not be a tab stop. Deliberately not using offsetParent or
      // getClientRects(): both report "not rendered" under jsdom, which would
      // make the trap silently inert in every test.
      !el.hasAttribute("hidden") &&
      el.getAttribute("aria-hidden") !== "true",
  );
}

/**
 * Makes a hand-rolled `role="dialog" aria-modal="true"` behave like a real
 * modal for keyboard and screen reader users.
 *
 * The three dialogs in this app (PositionTransferModal, KeyTransferModal,
 * BurnKeyModal) are plain divs rather than <dialog> or a Radix primitive, so
 * without this they fail three separate criteria:
 *
 * - SC 2.4.3 Focus Order / 2.1.2 No Keyboard Trap: Tab walked straight out
 *   of the dialog and into the page rendered behind it, because `aria-modal`
 *   only changes what assistive tech *announces*, not what the browser
 *   actually lets you reach. Focus is now cycled inside the container.
 * - SC 2.1.1 Keyboard: Escape did not close the dialog, so a keyboard user
 *   had no non-pointer way out of the Cancel button.
 * - Focus was never moved into the dialog on open, and was dropped on the
 *   floor when it closed, so the next Tab resumed from the top of the
 *   document rather than from the control that opened it.
 *
 * @param open    whether the dialog is currently mounted
 * @param onClose called on Escape; usually the same setter that closes it
 */
export function useDialogFocus(
  open: boolean,
  onClose: () => void,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Kept in a ref so the Tab handler can stay a single stable listener
  // instead of re-subscribing whenever the caller passes a new closure.
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const container = containerRef.current;
    if (!container) return;

    // Remember where focus came from so it can be handed back on close.
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Focus synchronously. Deferring this (rAF, setTimeout, a queued
    // microtask) reintroduces a window in which the dialog is open but
    // focus is still on the trigger, and a user who starts typing in that
    // window has their keystrokes redirected out of the dialog. There is no
    // competing focus-restore to race against here, because these are
    // hand-rolled dialogs rather than a Radix primitive.
    const preferred = container.querySelector<HTMLElement>("[data-autofocus]");
    const target = preferred ?? getFocusable(container)[0];
    target?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = getFocusable(container);
      if (focusable.length === 0) {
        // Nothing to move to; keep focus on the dialog itself.
        event.preventDefault();
        container.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && (active === first || !container.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    // Capture phase so the trap runs before anything else reacts to Tab.
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      // Restore unconditionally, guarded only on the trigger still being in
      // the document. It is safe to do this without re-checking where focus
      // currently sits: the trap guarantees focus cannot leave the dialog
      // while it is open, so the only element that can have held focus is
      // inside the subtree we are tearing down. Testing containment here
      // instead races the DOM removal, and focus ends up on <body>.
      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [open]);

  return containerRef;
}
