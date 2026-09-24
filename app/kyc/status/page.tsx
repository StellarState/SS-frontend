"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type KycStatus = "pending" | "approved" | "rejected";

interface KycStatusResponse {
  status: KycStatus;
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

const STATUS_CONFIG: Record<KycStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "Under Review", color: "text-amber-700", bg: "bg-amber-100" },
  approved: { label: "Approved", color: "text-green-700", bg: "bg-green-100" },
  rejected: { label: "Rejected", color: "text-red-700", bg: "bg-red-100" },
};

/**
 * #286 — KYC status page showing verification state with 60s polling.
 * Displays rejection reason when applicable, with resubmit CTA.
 */
export default function KycStatusPage() {
  const { data, isLoading } = useQuery<KycStatusResponse>({
    queryKey: ["kyc-status"],
    queryFn: async () => {
      const res = await fetch("/api/kyc/status");
      if (!res.ok) throw new Error("Failed to fetch KYC status");
      return res.json();
    },
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-12">
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">Loading…</CardContent>
        </Card>
      </div>
    );
  }

  const status = data?.status ?? "pending";
  const cfg = STATUS_CONFIG[status];

  return (
    <div className="container mx-auto max-w-lg px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>KYC Verification Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${cfg.bg} ${cfg.color}`}>
            {cfg.label}
          </div>

          <p className="text-sm text-muted-foreground">
            Submitted: {data?.submittedAt ? new Date(data.submittedAt).toLocaleDateString() : "—"}
          </p>

          {status === "approved" && data?.reviewedAt && (
            <p className="text-sm text-muted-foreground">
              Approved: {new Date(data.reviewedAt).toLocaleDateString()}
            </p>
          )}

          {status === "rejected" && data?.rejectionReason && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              <p className="font-semibold mb-1">Rejection reason:</p>
              <p>{data.rejectionReason}</p>
            </div>
          )}

          {status === "rejected" && (
            <Link href="/kyc/reapply">
              <Button className="w-full">Resubmit KYC</Button>
            </Link>
          )}

          {status === "pending" && (
            <p className="text-xs text-muted-foreground text-center">
              Status refreshes every 60 seconds.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
