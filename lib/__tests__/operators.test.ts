import { describe, expect, it } from "vitest";
import { Keypair } from "stellar-sdk";
import {
  countActiveOperators,
  expiryDateToIso,
  operatorAddressError,
  operatorExpiryError,
  operatorStatus,
} from "@/lib/operators";

const NOW = Date.parse("2026-06-01T12:00:00Z");

describe("operator helpers (#591)", () => {
  it("labels operators past their expiry as expired", () => {
    expect(operatorStatus({ address: "G", expires_at: "2026-07-01T00:00:00Z" }, NOW)).toBe("active");
    expect(operatorStatus({ address: "G", expires_at: "2026-05-01T00:00:00Z" }, NOW)).toBe("expired");
  });

  it("counts only active operators toward the limit", () => {
    const ops = [
      { address: "A", expires_at: "2026-07-01T00:00:00Z" },
      { address: "B", expires_at: "2026-05-01T00:00:00Z" },
    ];
    expect(countActiveOperators(ops, NOW)).toBe(1);
  });

  it("rejects malformed and contract addresses", () => {
    expect(operatorAddressError("", null, [], NOW)).toMatch(/Enter/);
    expect(operatorAddressError("GABC", null, [], NOW)).toBe("Invalid Stellar address");
    expect(operatorAddressError("CABC", null, [], NOW)).toMatch(/contract address/);
    const valid = Keypair.random().publicKey();
    expect(operatorAddressError(valid, null, [], NOW)).toBeNull();
    expect(operatorAddressError(valid, valid, [], NOW)).toMatch(/your own wallet/);
  });

  it("validates expiry dates", () => {
    expect(operatorExpiryError("", NOW)).toMatch(/Choose/);
    expect(operatorExpiryError("2026-05-31", NOW)).toMatch(/future/);
    expect(operatorExpiryError("2026-06-02", NOW)).toBeNull();
    expect(expiryDateToIso("2026-06-02")).toBe("2026-06-02T23:59:59.000Z");
  });
});
