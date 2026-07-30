"use client";

import { RouteStateCard } from "@/components/ui/RouteStateCard";
import { logError } from "@/lib/logger";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  logError("Unhandled render error", { error });

  return (
    <html lang="en">
      <body>
        <RouteStateCard
          title="Something went wrong"
          message="We ran into an unexpected issue. Please try again in a moment."
        />
      </body>
    </html>
  );
}
