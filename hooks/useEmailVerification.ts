"use client";

/**
 * Email verification state and mutations (issue #653).
 *
 * The resend cooldown is owned by the hook so every surface that can resend
 * (banner, change-email modal, settings) sees the same 60 second countdown.
 */

import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import {
  changeEmail,
  confirmEmailVerification,
  fetchEmailVerificationStatus,
  RESEND_COOLDOWN_SECONDS,
  sendVerificationEmail,
  type EmailVerificationStatus,
} from "@/lib/emailVerification";

export interface UseEmailVerificationResult {
  status: EmailVerificationStatus | undefined;
  isLoadingStatus: boolean;
  /** Whole seconds remaining before another verification email may be sent. */
  cooldownSeconds: number;
  resend: (email?: string) => Promise<void>;
  verify: (token: string) => Promise<void>;
  updateEmail: (email: string, password: string) => Promise<void>;
  isResending: boolean;
  isVerifying: boolean;
  isChangingEmail: boolean;
  refresh: () => void;
}

export function useEmailVerification(): UseEmailVerificationResult {
  const { jwt } = useAuth();
  const queryClient = useQueryClient();
  const token = jwt ?? undefined;
  const queryKey = ["email-verification", jwt];

  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const cooldownActive = cooldownSeconds > 0;

  useEffect(() => {
    if (!cooldownActive) return;
    const id = setInterval(
      () => setCooldownSeconds((seconds) => Math.max(0, seconds - 1)),
      1000,
    );
    return () => clearInterval(id);
  }, [cooldownActive]);

  const statusQuery = useQuery<EmailVerificationStatus, Error>({
    queryKey,
    queryFn: () => fetchEmailVerificationStatus(token),
    enabled: !!jwt,
    retry: 1,
  });

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey });
  }, [queryClient, jwt]);

  const resendMutation = useMutation({
    mutationFn: (email?: string) => sendVerificationEmail(email, token),
    onSuccess: () => setCooldownSeconds(RESEND_COOLDOWN_SECONDS),
  });

  const confirmMutation = useMutation({
    mutationFn: (code: string) => confirmEmailVerification(code, token),
    onSuccess: refresh,
  });

  const changeMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      changeEmail(email, password, token),
    onSuccess: () => {
      setCooldownSeconds(RESEND_COOLDOWN_SECONDS);
      refresh();
    },
  });

  return {
    status: statusQuery.data,
    isLoadingStatus: statusQuery.isLoading,
    cooldownSeconds,
    resend: (email) => resendMutation.mutateAsync(email),
    verify: (code) => confirmMutation.mutateAsync(code),
    updateEmail: (email, password) => changeMutation.mutateAsync({ email, password }),
    isResending: resendMutation.isPending,
    isVerifying: confirmMutation.isPending,
    isChangingEmail: changeMutation.isPending,
    refresh,
  };
}
