"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Copies the exact value shown beside it. */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={copy}
      aria-label={`Copy ${label}`}
      data-testid={`copy-${label}`}
    >
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}
