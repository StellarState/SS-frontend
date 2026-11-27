import Link from "next/link";
import { AcceptedAgreementsSection } from "@/components/settings/AcceptedAgreementsSection";
import { ArrowLeft } from "lucide-react";

export default function AgreementsSettingsPage() {
  return (
    <main className="container mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Settings
        </Link>
        <h1 className="text-2xl font-semibold text-foreground">
          Legal & Investment Agreements
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          View accepted versions of the StellarState Master Investor Agreement and download copies for your records.
        </p>
      </div>

      <AcceptedAgreementsSection />
    </main>
  );
}
