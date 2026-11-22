"use client";
/**
 * Inline glossary term popover (issue #624)
 *
 * Wraps a term label in a dotted underline span. On hover or focus, a popover
 * shows the term's definition and a link to the full glossary page.
 * Keyboard accessible via tabIndex and dismissible with Escape.
 */
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import glossaryData from "@/src/content/glossary.json";

interface GlossaryTermProps {
  /** The term to look up in the glossary. Must match a "term" entry exactly. */
  term: string;
  children: ReactNode;
}

export function GlossaryTerm({ term, children }: GlossaryTermProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);

  const entry = glossaryData.find(
    (g) => g.term.toLowerCase() === term.toLowerCase()
  );

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!entry) {
    // No glossary entry — render children without decoration.
    return <>{children}</>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span
          ref={triggerRef}
          role="button"
          tabIndex={0}
          className="border-b border-dotted border-current cursor-help"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          aria-label={`Definition of ${entry.term}`}
        >
          {children}
        </span>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 space-y-2"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <p className="font-semibold text-sm">{entry.term}</p>
        <p className="text-sm text-muted-foreground">{entry.definition}</p>
        {entry.related.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Related:{" "}
            {entry.related.map((r, i) => (
              <span key={r}>
                {i > 0 && ", "}
                <Link
                  href={`/learn/glossary#${encodeURIComponent(r.toLowerCase())}`}
                  className="underline hover:text-foreground"
                >
                  {r}
                </Link>
              </span>
            ))}
          </p>
        )}
        <Link
          href="/learn/glossary"
          className="block text-xs text-primary underline"
        >
          See full glossary →
        </Link>
      </PopoverContent>
    </Popover>
  );
}
