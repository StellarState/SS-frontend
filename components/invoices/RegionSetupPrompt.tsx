"use client";
/**
 * Inline prompt shown when an investor has no registered region (#618).
 * Links them to the account verification flow.
 */
import Link from "next/link";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RegionSetupPrompt() {
  return (
    <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
      <div className="flex-1 space-y-1">
        <p className="font-medium text-amber-900">Region not configured</p>
        <p className="text-amber-800">
          Set up your region to invest in restricted invoices.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-1">
          <Link href="/settings/account">Set up region</Link>
        </Button>
      </div>
    </div>
  );
}
