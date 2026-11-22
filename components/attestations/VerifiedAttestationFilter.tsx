"use client";

import { Label } from "@/components/ui/label";

/** Marketplace checkbox for invoices with a verified attestation. */
export function VerifiedAttestationFilter({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="space-y-3" data-testid="verified-attestation-filter">
      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Attestation
      </Label>
      <label className="flex items-center gap-2 text-sm cursor-pointer hover:text-foreground">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="size-4 rounded border-gray-300 accent-primary"
          data-testid="filter-verified-attestation"
        />
        <span>Verified attestation only</span>
      </label>
    </div>
  );
}
