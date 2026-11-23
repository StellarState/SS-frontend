"use client";

/**
 * Wallet installation and connection troubleshooting guide (issue #752).
 * Opened from the connect dialog and from connection errors.
 */

import { useState } from "react";
import { Copy, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SUPPORTED_WALLETS, WALLET_INSTALL_URLS, WALLET_LABELS } from "@/lib/stellar";
import { useWallet } from "@/context/WalletContext";
import { useWalletDetection, type WalletDetection, type WalletFailureReason } from "@/hooks/useWalletDetection";

type Fix = { id: string; title: string; detail: string };

const FIXES: Fix[] = [
  { id: "locked", title: "Unlock your wallet", detail: "Open the extension and enter your password, then try again." },
  { id: "popups", title: "Allow pop-ups", detail: "Allow pop-ups for this site so the wallet can ask for approval." },
  { id: "network", title: "Check the network", detail: "Switch the wallet to the same network as StellarSettle (Testnet or Mainnet)." },
  { id: "adblock", title: "Pause ad or script blockers", detail: "Blockers can hide the extension from the page; allow this site." },
];

const REASON_COPY: Record<Exclude<WalletFailureReason, null>, { headline: string; first: string }> = {
  not_installed: { headline: "No Stellar wallet was detected in this browser.", first: "adblock" },
  declined: { headline: "The connection request was declined or closed.", first: "locked" },
  connection_failed: { headline: "The wallet did not respond.", first: "popups" },
};

/** Checklist with the fix most relevant to `reason` first. */
export function orderedFixes(reason: WalletFailureReason): Fix[] {
  const first = reason ? REASON_COPY[reason].first : null;
  return [...FIXES].sort((a, b) => Number(b.id === first) - Number(a.id === first));
}

/** Support diagnostics: environment and detection only — never addresses or keys. */
export function buildDiagnostics(detection: WalletDetection | null, network: string): string {
  const nav = typeof navigator === "undefined" ? undefined : navigator;
  return JSON.stringify(
    {
      userAgent: nav?.userAgent ?? "unknown",
      language: nav?.language ?? "unknown",
      online: nav?.onLine ?? null,
      network,
      wallets: detection?.availability ?? null,
      reason: detection?.reason ?? null,
      at: new Date().toISOString(),
    },
    null,
    2
  );
}

interface WalletHelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WalletHelpModal({ open, onOpenChange }: WalletHelpModalProps) {
  const { error, network } = useWallet();
  const { detection, isChecking, recheck } = useWalletDetection(open, error);
  const [copied, setCopied] = useState(false);
  const reason = detection?.reason ?? null;

  async function copyDiagnostics() {
    await navigator.clipboard?.writeText(buildDiagnostics(detection, network ?? "unknown"));
    setCopied(true);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="wallet-help-modal" className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Wallet connection help</DialogTitle>
          <DialogDescription>
            {reason ? REASON_COPY[reason].headline : "Follow these steps if your wallet will not connect."}
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2" aria-label="Supported wallets">
          {SUPPORTED_WALLETS.map((wallet) => {
            const installed = detection?.availability[wallet];
            return (
              <li key={wallet} data-testid={`help-wallet-${wallet}`} className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">
                  {WALLET_LABELS[wallet]} — {installed ? "detected" : installed === false ? "not installed" : "checking…"}
                </span>
                {installed === false && (
                  <Button asChild variant="outline" size="sm">
                    <a href={WALLET_INSTALL_URLS[wallet]} target="_blank" rel="noopener noreferrer" data-testid={`help-install-${wallet}`}>
                      <Download /> Install
                    </a>
                  </Button>
                )}
              </li>
            );
          })}
        </ul>

        <ol className="list-decimal space-y-2 pl-5 text-sm" data-testid="help-checklist">
          {orderedFixes(reason).map((fix) => (
            <li key={fix.id} data-testid={`help-fix-${fix.id}`}>
              <span className="font-medium">{fix.title}.</span> {fix.detail}
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void recheck()} disabled={isChecking} data-testid="help-recheck">
            <RefreshCw className={isChecking ? "animate-spin" : undefined} /> Recheck
          </Button>
          <Button type="button" variant="outline" onClick={() => void copyDiagnostics()} data-testid="help-copy-diagnostics">
            <Copy /> {copied ? "Copied" : "Copy diagnostics"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
