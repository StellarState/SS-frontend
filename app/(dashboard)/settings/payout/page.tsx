import { PayoutDestinationsPanel } from "@/components/payouts/PayoutDestinationsPanel";

/** #649: saved payout destinations and withdrawal picker. */
export default function PayoutSettingsPage() {
  return (
    <main className="container mx-auto max-w-2xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Payout destinations</h1>
      <PayoutDestinationsPanel />
    </main>
  );
}
