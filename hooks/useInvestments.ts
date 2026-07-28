"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createInvestment } from "@/lib/api";
import { toast } from "sonner";
import { INVOICES_QUERY_KEY } from "./useInvoices";
import type { InvestmentRequest } from "@/lib/types";

function truncateTxHash(hash: string, chars = 8): string {
  return hash.slice(0, chars);
}

function getStellarExpertUrl(txHash: string): string {
  const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK || "testnet";
  const host =
    network === "mainnet"
      ? "stellar.expert"
      : "testnet.stellar.expert";
  return `https://${host}/explorer/tx/${txHash}`;
}

export function useInvest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createInvestment,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEY });

      if (data.txHash) {
        const truncated = truncateTxHash(data.txHash);
        const expertUrl = getStellarExpertUrl(data.txHash);

        toast.success("Investment confirmed", {
          description: `Tx: ${truncated}…`,
          duration: 6000,
          action: {
            label: "View on Stellar Expert",
            onClick: () => window.open(expertUrl, "_blank", "noopener"),
          },
        });
      }
    },
    onError: (error: Error) => {
      toast.error("Investment failed", {
        description: error.message || "Transaction could not be completed.",
        duration: 6000,
      });
    },
  });
}
