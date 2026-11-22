"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useAttestations } from "@/hooks/useAttestations";
import { activeAttestations, hasInvalidatedAttestation } from "@/lib/attestations";
import { AttestationBadge } from "./AttestationBadge";

/** Data-room list of individual auditor verdicts. */
export function AttestationList({ invoiceId }: { invoiceId: string }) {
  const { data = [], isLoading } = useAttestations(invoiceId);
  const active = activeAttestations(data);
  const invalidated = hasInvalidatedAttestation(data);

  if (isLoading) {
    return <Skeleton className="h-16 w-full" data-testid="attestation-list-loading" />;
  }

  return (
    <section className="space-y-3" data-testid="attestation-list">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Document attestations</h3>
        <AttestationBadge attestations={data} />
      </div>

      {invalidated && (
        <p className="rounded-md border border-amber-500/50 bg-amber-500/10 p-2 text-xs text-amber-700" role="alert" data-testid="attestation-invalidated">
          The document changed after review. Existing attestations no longer apply to the current version.
        </p>
      )}

      {active.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="attestation-empty">
          No active auditor has reviewed these documents.
        </p>
      ) : (
        <ul className="divide-y rounded-md border" data-testid="attestation-rows">
          {active.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between p-3 text-sm" data-testid={`attestation-${entry.id}`}>
              <span className="font-medium">{entry.auditor}</span>
              <span className="capitalize text-muted-foreground">{entry.verdict}</span>
              <span className="text-xs text-muted-foreground">
                {entry.datedAt ? new Date(entry.datedAt).toLocaleDateString() : "Date unavailable"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
