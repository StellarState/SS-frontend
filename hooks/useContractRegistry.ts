"use client";

import { useQuery } from "@tanstack/react-query";
import {
  DEFAULT_TRUST_CONFIG,
  fetchTrustConfig,
  type TrustAudit,
  type TrustConfig,
  type TrustContract,
} from "@/lib/trust";

export interface ContractRegistryResult {
  contracts: TrustContract[];
  audits: TrustAudit[];
  config: TrustConfig;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Public deployed-contract registry and audit metadata (issue #655).
 *
 * Falls back to the built-in copy on network failure so the trust page still
 * explains how funds are protected instead of collapsing to an empty state.
 */
export function useContractRegistry(): ContractRegistryResult {
  const query = useQuery<TrustConfig, Error>({
    queryKey: ["public-trust-config"],
    queryFn: ({ signal }) => fetchTrustConfig(signal),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return {
    contracts: query.data?.contracts ?? DEFAULT_TRUST_CONFIG.contracts,
    audits: query.data?.audits ?? DEFAULT_TRUST_CONFIG.audits,
    config: query.data ?? DEFAULT_TRUST_CONFIG,
    isLoading: query.isLoading,
    error: query.error,
  };
}
