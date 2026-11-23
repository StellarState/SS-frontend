"use client";

import { useState, useMemo, useCallback } from "react";
import {
  RecoveryControlId,
  RecoveryControlItem,
  RecoveryAddressCooldown,
  computeReadinessScore,
  initiateRecoveryAddressChange,
  isCooldownCompleted,
  INITIAL_RECOVERY_CONTROLS,
  DEFAULT_COOLDOWN_HOURS,
} from "@/lib/security/recoveryReadiness";

export interface UseRecoveryReadinessOptions {
  initialControls?: RecoveryControlItem[];
  initialRecoveryAddress?: string;
  initialCooldown?: RecoveryAddressCooldown | null;
}

export function useRecoveryReadiness(options?: UseRecoveryReadinessOptions) {
  const [controls, setControls] = useState<RecoveryControlItem[]>(
    options?.initialControls ?? INITIAL_RECOVERY_CONTROLS
  );
  const [currentRecoveryAddress, setCurrentRecoveryAddress] = useState<string | null>(
    options?.initialRecoveryAddress ?? "GCRECOVERYGUARDIANWALLET99881122334455667788STLT"
  );
  const [activeCooldown, setActiveCooldown] = useState<RecoveryAddressCooldown | null>(
    options?.initialCooldown ?? null
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const { score, tier } = useMemo(() => computeReadinessScore(controls), [controls]);

  const toggleControlItem = useCallback((id: RecoveryControlId) => {
    setActionError(null);
    setActionSuccess(null);
    setControls((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextState = !item.isConfigured;
          return {
            ...item,
            isConfigured: nextState,
            configuredAt: nextState ? new Date().toISOString() : null,
            details: nextState ? "Configured & Active" : "Disabled",
          };
        }
        return item;
      })
    );
  }, []);

  const initiateAddressUpdate = useCallback(
    (newAddress: string, hours: number = DEFAULT_COOLDOWN_HOURS) => {
      setActionError(null);
      setActionSuccess(null);
      if (!newAddress || newAddress.trim() === "") {
        setActionError("Please provide a valid Stellar recovery address.");
        return { success: false, error: "Empty address" };
      }

      if (newAddress === currentRecoveryAddress) {
        setActionError("New recovery address must be different from the current address.");
        return { success: false, error: "Same address" };
      }

      const cooldown = initiateRecoveryAddressChange(newAddress, hours);
      setActiveCooldown(cooldown);
      setActionSuccess(
        `48-Hour Security Cooldown initiated for target recovery address ${newAddress.slice(0, 8)}...`
      );
      return { success: true };
    },
    [currentRecoveryAddress]
  );

  const cancelAddressUpdate = useCallback(() => {
    setActiveCooldown(null);
    setActionError(null);
    setActionSuccess("Pending recovery address change was canceled.");
  }, []);

  const finalizeAddressUpdate = useCallback(() => {
    setActionError(null);
    setActionSuccess(null);
    if (!activeCooldown) {
      setActionError("No active recovery address change in progress.");
      return { success: false, error: "No cooldown" };
    }

    if (!isCooldownCompleted(activeCooldown)) {
      setActionError("Security cooldown is still active. Please wait until the timelock expires.");
      return { success: false, error: "Cooldown active" };
    }

    const appliedAddress = activeCooldown.pendingAddress;
    setCurrentRecoveryAddress(appliedAddress);
    setActiveCooldown(null);
    setActionSuccess(`Recovery address successfully updated to ${appliedAddress.slice(0, 8)}...`);
    return { success: true };
  }, [activeCooldown]);

  const simulateCooldownComplete = useCallback(() => {
    if (!activeCooldown) return;
    const expiredTimestamp = new Date(Date.now() - 1000).toISOString();
    setActiveCooldown({
      ...activeCooldown,
      cooldownEndsAt: expiredTimestamp,
    });
  }, [activeCooldown]);

  return {
    controls,
    score,
    tier,
    currentRecoveryAddress,
    activeCooldown,
    isCooldownDone: isCooldownCompleted(activeCooldown),
    actionError,
    actionSuccess,
    toggleControlItem,
    initiateAddressUpdate,
    cancelAddressUpdate,
    finalizeAddressUpdate,
    simulateCooldownComplete,
  };
}
