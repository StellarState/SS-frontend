import { Suspense } from "react";
import { VerifyEmailRoute } from "@/components/email/VerifyEmailRoute";

/** Public email-confirmation route (issue #653). */
export default function VerifyEmailPageRoute() {
  return (
    <Suspense fallback={<p className="p-8 text-center">Loading verification...</p>}>
      <VerifyEmailRoute />
    </Suspense>
  );
}
