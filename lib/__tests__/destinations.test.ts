import { describe, expect, it } from "vitest";

import {
  addDestination,
  isValidStellarAddress,
  parseDestinations,
  removeDestination,
  updateDestination,
  validateDestination,
} from "../destinations";

const VALID = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

describe("payout destinations", () => {
  it("validates Stellar public keys", () => {
    expect(isValidStellarAddress(VALID)).toBe(true);
    expect(isValidStellarAddress("Gshort")).toBe(false);
    expect(isValidStellarAddress("M" + VALID.slice(1))).toBe(false);
    expect(isValidStellarAddress(VALID.replace(/[A-Z]/, "0"))).toBe(false);
  });

  it("rejects invalid addresses with an inline error", () => {
    const result = validateDestination({ label: "Bank", address: "not-an-address" });
    expect(result.valid).toBe(false);
    expect(result.errors.address).toMatch(/invalid/i);
  });

  it("requires a label", () => {
    const result = validateDestination({ label: "  ", address: VALID });
    expect(result.valid).toBe(false);
    expect(result.errors.label).toBeDefined();
  });

  it("warns when a memo is required but missing", () => {
    const result = validateDestination({ label: "Exchange", address: VALID, requiresMemo: true });
    expect(result.valid).toBe(false);
    expect(result.errors.memo).toMatch(/memo/i);
  });

  it("accepts a valid destination with a memo and marks it unconfirmed", () => {
    const result = validateDestination({
      label: "Exchange",
      address: VALID,
      requiresMemo: true,
      memo: "12345",
    });
    expect(result.valid).toBe(true);
    expect(result.destination?.confirmed).toBe(false);
    expect(result.destination?.memo).toBe("12345");
  });

  it("performs add, edit and delete immutably", () => {
    const first = addDestination([], {
      label: "Bank",
      address: VALID,
      requiresMemo: false,
    });
    expect(first).toHaveLength(1);
    const edited = updateDestination(first, first[0].id, { label: "Main bank" });
    expect(edited[0].label).toBe("Main bank");
    expect(first[0].label).toBe("Bank");
    expect(removeDestination(edited, first[0].id)).toEqual([]);
  });

  it("confirms a destination before first withdrawal", () => {
    const first = addDestination([], { label: "Bank", address: VALID, requiresMemo: false });
    expect(first[0].confirmed).toBe(false);
    const confirmed = updateDestination(first, first[0].id, { confirmed: true });
    expect(confirmed[0].confirmed).toBe(true);
  });

  it("recovers from corrupt stored data", () => {
    expect(parseDestinations("not json")).toEqual([]);
    expect(parseDestinations(JSON.stringify([{ label: "no address" }]))).toEqual([]);
  });
});
