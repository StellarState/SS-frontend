"use client";

/** Explains why an amount cannot be submitted and states the maximum allowed. */
export function ExposureWarning({
  blocked,
  maximum,
}: {
  blocked: boolean;
  maximum: number;
}) {
  if (!blocked) return null;
  return (
    <p className="text-sm text-destructive" role="alert" data-testid="exposure-blocked">
      Amount exceeds the remaining debtor headroom. Maximum allowed:{" "}
      {maximum.toLocaleString()} XLM.
    </p>
  );
}
