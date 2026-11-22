"use client";
import { useState, useCallback, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

const SANDBOX_KEY = "tipz_sandbox";
const SANDBOX_FAUCET_TS_KEY = "tipz_sandbox_faucet_ts";

function readSandbox(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SANDBOX_KEY) === "true";
}

export function useSandboxMode() {
  const [isSandbox, setIsSandbox] = useState<boolean>(readSandbox);

  const toggleSandbox = useCallback(() => {
    setIsSandbox((prev) => {
      const next = !prev;
      localStorage.setItem(SANDBOX_KEY, String(next));
      return next;
    });
  }, []);

  return { isSandbox, toggleSandbox };
}

function hasRequestedToday(): boolean {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem(SANDBOX_FAUCET_TS_KEY);
  if (!stored) return false;
  const last = new Date(stored);
  const now = new Date();
  return (
    last.getFullYear() === now.getFullYear() &&
    last.getMonth() === now.getMonth() &&
    last.getDate() === now.getDate()
  );
}

async function requestFaucet(): Promise<void> {
  const res = await fetch("/api/sandbox/faucet", { method: "POST" });
  if (!res.ok) {
    throw new Error(`Faucet request failed: ${res.status}`);
  }
  localStorage.setItem(SANDBOX_FAUCET_TS_KEY, new Date().toISOString());
}

export function useSandboxFunds() {
  return useMutation({
    mutationFn: async () => {
      if (hasRequestedToday()) {
        throw new Error("You have already requested practice funds today. Try again tomorrow.");
      }
      return requestFaucet();
    },
    onSuccess: () => {
      toast.success("Practice funds added to your sandbox account.");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Could not request practice funds.");
    },
  });
}
