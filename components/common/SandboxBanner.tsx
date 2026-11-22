"use client";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSandboxMode } from "@/hooks/useSandboxMode";

export function SandboxBanner() {
  const { isSandbox, toggleSandbox } = useSandboxMode();

  if (!isSandbox) return null;

  return (
    <div
      className="w-full bg-yellow-400 text-yellow-900 px-4 py-2 flex items-center justify-between gap-4"
      role="banner"
      data-testid="sandbox-banner"
    >
      <span className="text-sm font-semibold">
        You are in Practice Mode — actions use test funds only
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="text-yellow-900 hover:bg-yellow-500 hover:text-yellow-900 h-7 px-2 shrink-0"
        onClick={toggleSandbox}
      >
        <X className="size-3.5 mr-1" />
        Exit Practice Mode
      </Button>
    </div>
  );
}
