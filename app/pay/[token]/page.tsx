"use client";

import { useParams } from "next/navigation";
import { PaymentInstructions } from "@/components/payment/PaymentInstructions";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function PaymentInstructionsPage() {
  usePageTitle("Payment instructions");
  const params = useParams<{ token: string }>();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;

  return (
    <main className="container mx-auto max-w-5xl px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pay your invoice</h1>
        <p className="text-sm text-muted-foreground">
          Send the exact amount with the memo below so the payment can be matched.
        </p>
      </div>
      <PaymentInstructions token={token ?? ""} />
    </main>
  );
}
