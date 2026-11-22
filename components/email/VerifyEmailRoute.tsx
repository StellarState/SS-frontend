"use client";

import { VerifyEmailPage } from "./VerifyEmailPage";
import { useEmailVerification } from "@/hooks/useEmailVerification";

/** Connects the public verification screen to the confirmation mutation. */
export function VerifyEmailRoute() {
  const { verify } = useEmailVerification();
  return <VerifyEmailPage onConfirm={(token) => verify(token)} />;
}
