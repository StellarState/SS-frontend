"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/context/WalletContext";
import { useActiveNetwork } from "@/hooks/useActiveNetwork";
import { addInvestmentTrustline, getWalletSigner } from "@/lib/stellar/trustline";

interface TrustlineStepProps {
  hasTrustline: boolean;
  onSuccess: () => void;
}

/** Step 2 of the funding guide: submit a changeTrust operation (#648). */
export function TrustlineStep({ hasTrustline, onSuccess }: TrustlineStepProps) {
  const { address, wallet } = useWallet();
  const { network } = useActiveNetwork();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (hasTrustline) {
    return (
      <p data-testid="trustline-complete" className="text-sm text-green-800 dark:text-green-300">
        Trustline is active. You can acquire the investment asset.
      </p>
    );
  }

  async function handleAdd() {
    if (!address) return;
    const signer = getWalletSigner(wallet);
    if (!signer) {
      setError("Connect a supported wallet (Freighter or Albedo) to add a trustline.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await addInvestmentTrustline(address, network, signer);
      toast.success("Trustline added");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the trustline.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        size="sm"
        onClick={handleAdd}
        disabled={submitting || !address}
        data-testid="add-trustline"
      >
        {submitting && <Loader2 aria-hidden="true" className="mr-1 size-4 animate-spin" />}
        Add trustline
      </Button>
      {error && (
        <p role="alert" data-testid="trustline-error" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
