import { Metadata } from "next";
import { DebtorPaymentLanding } from "@/components/debtor/DebtorPaymentLanding";

export const metadata: Metadata = {
  title: "Debtor Settlement Payment Portal | StellarState",
  description: "Official settlement payment destination and payment instructions for invoice debtor.",
};

interface PayPageProps {
  params: Promise<{
    invoiceId: string;
  }>;
}

export default async function DebtorPayPage({ params }: PayPageProps) {
  const { invoiceId } = await params;

  return (
    <main className="min-h-screen py-10 px-4 bg-muted/10">
      <DebtorPaymentLanding />
    </main>
  );
}
