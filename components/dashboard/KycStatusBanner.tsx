"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export type KycStatus = "pending" | "rejected" | "approved" | "not_submitted";

interface KycStatusBannerProps {
  status: KycStatus;
}

const KYC_START_ROUTE = "/kyc/start";
const KYC_REAPPLY_ROUTE = "/kyc/reapply";

export function KycStatusBanner({ status }: KycStatusBannerProps) {
  if (status === "approved") {
    return null;
  }

  if (status === "pending") {
    return (
      <div
        role="status"
        className="flex items-center rounded-md border bg-muted px-4 py-3 text-sm"
      >
        <p>Your KYC is under review</p>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div
        role="alert"
        className="flex items-center justify-between rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm"
      >
        <p>Your KYC was rejected</p>
        <Button asChild variant="destructive" size="sm">
          <Link href={KYC_REAPPLY_ROUTE}>Reapply</Link>
        </Button>
      </div>
    );
  }

  return (
    <div
      role="status"
      className="flex items-center justify-between rounded-md border bg-muted px-4 py-3 text-sm"
    >
      <p>Complete KYC to publish invoices</p>
      <Button asChild size="sm">
        <Link href={KYC_START_ROUTE}>Start KYC</Link>
      </Button>
    </div>
  );
}
