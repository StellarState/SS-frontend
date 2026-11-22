"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ATTESTATION_TOOLTIP, attestationBadgeState } from "@/lib/attestations";
import type { Attestation } from "@/lib/api/attestations";

const VARIANTS = {
  Verified: "default",
  Mixed: "secondary",
  Unreviewed: "outline",
} as const;

/** Badge counts only active, non-revoked auditors. */
export function AttestationBadge({ attestations }: { attestations: readonly Attestation[] }) {
  const state = attestationBadgeState(attestations);
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} data-testid="attestation-badge" aria-label={`Attestation status: ${state}`}>
            <Badge variant={VARIANTS[state]}>{state}</Badge>
          </span>
        </TooltipTrigger>
        <TooltipContent data-testid="attestation-tooltip">{ATTESTATION_TOOLTIP}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
