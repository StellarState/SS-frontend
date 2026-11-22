"use client";
/**
 * Jurisdiction eligibility notice shown on the invest panel (#618).
 *
 * Three states:
 *  - eligible: renders nothing
 *  - not_eligible: amber banner explaining the restriction
 *  - region_not_set: prompt to configure the investor's region
 *
 * The component also exports `useIsIneligible(invoiceId)` for the invest
 * button to stay disabled when eligibility blocks investing.
 */
import { AlertTriangle } from "lucide-react";
import { useInvoiceEligibility } from "@/hooks/useInvoiceEligibility";
import { RegionSetupPrompt } from "./RegionSetupPrompt";

interface EligibilityNoticeProps {
  invoiceId: string;
}

export function EligibilityNotice({ invoiceId }: EligibilityNoticeProps) {
  const { status, data, isLoading } = useInvoiceEligibility(invoiceId);

  // No restrictions configured — nothing to show.
  if (
    isLoading ||
    !data ||
    (!data.allowedRegions?.length && status === "eligible")
  ) {
    return null;
  }

  if (status === "eligible") return null;

  if (status === "region_not_set") {
    return <RegionSetupPrompt />;
  }

  // not_eligible
  const regionList =
    data.allowedRegions && data.allowedRegions.length > 0
      ? data.allowedRegions.join(", ")
      : "certain regions";

  return (
    <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
      <div className="space-y-0.5">
        <p className="font-medium text-amber-900">Not available in your region</p>
        <p className="text-amber-800">
          This invoice is restricted to investors in{" "}
          <span className="font-semibold">{regionList}</span>.
          {data.investorRegion
            ? ` Your registered region is ${data.investorRegion}.`
            : ""}
        </p>
      </div>
    </div>
  );
}

/**
 * Returns true when the investor is ineligible to invest (blocks the button).
 */
export function useIsIneligible(invoiceId: string): boolean {
  const { status, data } = useInvoiceEligibility(invoiceId);
  if (!data?.allowedRegions?.length) return false;
  return status === "not_eligible" || status === "region_not_set";
}
