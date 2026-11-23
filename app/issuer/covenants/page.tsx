import { Metadata } from "next";
import { CovenantMonitoringDashboard } from "@/components/issuers/CovenantMonitoringDashboard";

export const metadata: Metadata = {
  title: "Covenant Monitoring Dashboard | StellarState",
  description: "Real-time covenant tracking, headroom buffers, cure countdowns, and verified evidence.",
};

export default function IssuerCovenantsPage() {
  return (
    <main className="container mx-auto py-8 px-4">
      <CovenantMonitoringDashboard />
    </main>
  );
}
