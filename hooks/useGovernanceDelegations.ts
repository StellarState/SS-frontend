"use client";

import { useState, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useStellarWallet } from "@/hooks/useStellarWallet";
import {
  GovernanceDelegation,
  SAMPLE_DELEGATIONS,
  calculateEffectiveVotingPower,
  createDelegation,
  revokeDelegation,
  validateDelegationTarget,
  DelegationScope,
} from "@/lib/governance/delegations";
import { toast } from "sonner";

export interface UseGovernanceDelegationsOptions {
  keyId: string;
  initialOwnCustodyKeys?: number;
  initialOutgoingDelegations?: GovernanceDelegation[];
  initialIncomingDelegations?: GovernanceDelegation[];
  whitelistEnabled?: boolean;
  whitelistedAddresses?: string[];
  targetProposalId?: string;
}

export function useGovernanceDelegations(options: UseGovernanceDelegationsOptions) {
  const { address: authAddress } = useAuth();
  const { address: walletAddress } = useStellarWallet();
  const userAddress = authAddress ?? walletAddress ?? "GDUSC4MAINNETESCROWSETTLEPOOL2026771ABCDEF1234567890STLT";

  const ownCustodyKeys = options.initialOwnCustodyKeys ?? 50;
  const whitelistEnabled = options.whitelistEnabled ?? false;
  const whitelistedAddresses = options.whitelistedAddresses ?? [
    "GBSOLARISSTEWARDDELEGATEPOOL2026XYZ98765432101234567STLT",
    "GBAPPROVEDSTEWARD2026COMMUNITYREPRESENTATIVE1234567STLT",
  ];

  const [outgoingDelegations, setOutgoingDelegations] = useState<GovernanceDelegation[]>(
    options.initialOutgoingDelegations ?? SAMPLE_DELEGATIONS
  );
  const [incomingDelegations, setIncomingDelegations] = useState<GovernanceDelegation[]>(
    options.initialIncomingDelegations ?? []
  );

  const powerMetrics = useMemo(() => {
    return calculateEffectiveVotingPower({
      ownCustodyKeys,
      outgoingDelegations,
      incomingDelegations,
      targetProposalId: options.targetProposalId,
    });
  }, [ownCustodyKeys, outgoingDelegations, incomingDelegations, options.targetProposalId]);

  const addDelegation = useCallback(
    (params: {
      delegateAddress: string;
      votingPower: number;
      scope: DelegationScope;
      targetProposalId?: string | null;
      expiresInDays: number;
    }) => {
      try {
        const newDel = createDelegation({
          id: `DEL-${Date.now()}`,
          keyId: options.keyId,
          delegatorAddress: userAddress,
          delegateAddress: params.delegateAddress,
          votingPower: params.votingPower,
          scope: params.scope,
          targetProposalId: params.targetProposalId,
          expiresInDays: params.expiresInDays,
          whitelistEnabled,
          whitelistedAddresses,
        });

        setOutgoingDelegations((prev) => [newDel, ...prev]);
        toast.success(
          `Successfully delegated ${params.votingPower} voting power to ${params.delegateAddress.slice(0, 8)}...`
        );
        return { success: true };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to delegate";
        toast.error(message);
        return { success: false, error: message };
      }
    },
    [options.keyId, userAddress, whitelistEnabled, whitelistedAddresses]
  );

  const handleRevoke = useCallback((delegationId: string) => {
    setOutgoingDelegations((prev) => revokeDelegation(delegationId, prev));
    toast.success("Delegation revoked. Voting power restored to your custody.");
  }, []);

  const validateTarget = useCallback(
    (delegateAddress: string) => {
      return validateDelegationTarget({
        delegateAddress,
        delegatorAddress: userAddress,
        whitelistEnabled,
        whitelistedAddresses,
      });
    },
    [userAddress, whitelistEnabled, whitelistedAddresses]
  );

  return {
    userAddress,
    ownCustodyKeys,
    whitelistEnabled,
    whitelistedAddresses,
    outgoingDelegations,
    incomingDelegations,
    powerMetrics,
    addDelegation,
    handleRevoke,
    validateTarget,
  };
}
