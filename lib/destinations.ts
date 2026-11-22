/**
 * Saved payout destinations (#649).
 *
 * Pure validation and CRUD helpers. Persistence lives in useDestinations;
 * keeping the logic here makes validation and confirmation independently
 * testable, including corrupt storage and invalid input.
 */

export interface Destination {
  id: string;
  label: string;
  address: string;
  memo?: string;
  requiresMemo: boolean;
  /** New destinations need email/2FA confirmation before their first use. */
  confirmed: boolean;
  createdAt: string;
}

export type DestinationInput = Pick<
  Destination,
  "label" | "address" | "requiresMemo" | "memo"
>;

export const DESTINATIONS_STORAGE_KEY = "ss-payout-destinations";

const STELLAR_PUBLIC_KEY = /^G[A-Z2-7]{55}$/;

export function isValidStellarAddress(address: string): boolean {
  return STELLAR_PUBLIC_KEY.test(address.trim());
}

export type ValidatedDestination = DestinationInput & { confirmed: false };

export interface ValidationResult {
  valid: boolean;
  errors: { label?: string; address?: string; memo?: string };
  destination?: ValidatedDestination;
}

export function validateDestination(input: Partial<DestinationInput>): ValidationResult {
  const errors: ValidationResult["errors"] = {};
  const label = (input.label ?? "").trim();
  const address = (input.address ?? "").trim();
  const memo = (input.memo ?? "").trim();
  const requiresMemo = Boolean(input.requiresMemo);

  if (!label) errors.label = "Enter a label for this destination.";
  if (!isValidStellarAddress(address)) {
    errors.address = "Invalid Stellar address. Enter a public key starting with G.";
  }
  if (requiresMemo && !memo) {
    errors.memo = "This destination requires a memo. Add one before saving.";
  }

  if (Object.keys(errors).length > 0) return { valid: false, errors };

  return {
    valid: true,
    errors,
    destination: { label, address, requiresMemo, memo: memo || undefined, confirmed: false },
  };
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `dest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function addDestination(list: Destination[], input: DestinationInput): Destination[] {
  const destination: Destination = {
    ...input,
    id: createId(),
    confirmed: false,
    createdAt: new Date().toISOString(),
  };
  return [...list, destination];
}

export function updateDestination(
  list: Destination[],
  id: string,
  patch: Partial<Destination>,
): Destination[] {
  return list.map((destination) =>
    destination.id === id ? { ...destination, ...patch, id } : destination,
  );
}

export function removeDestination(list: Destination[], id: string): Destination[] {
  return list.filter((destination) => destination.id !== id);
}

/** Parses stored destinations, dropping any record that cannot be trusted. */
export function parseDestinations(raw: string | null | undefined): Destination[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is Destination => {
      if (typeof item !== "object" || item === null) return false;
      const candidate = item as Record<string, unknown>;
      return (
        typeof candidate.id === "string" &&
        typeof candidate.label === "string" &&
        typeof candidate.address === "string" &&
        isValidStellarAddress(candidate.address)
      );
    });
  } catch {
    return [];
  }
}

export function needsMemoWarning(destination: Destination): boolean {
  return destination.requiresMemo && !destination.memo?.trim();
}
