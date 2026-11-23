"use client";

import { useDebtorHeadroom } from "@/hooks/useDebtorHeadroom";
import { exceedsHeadroom, maxAllowed } from "@/lib/exposure";

/** Shared exposure gate for the invest panel and issuer form. */
export function useExposureLimit(
  debtorId: string | null | undefined,
  amount: number | null,
  requestedCap: number
) {
  const { data: headroom } = useDebtorHeadroom(debtorId);
  return {
    headroom,
    blocked: headroom ? exceedsHeadroom(headroom, amount ?? 0) : false,
    maximum: headroom ? maxAllowed(headroom, requestedCap) : requestedCap,
  };
}
