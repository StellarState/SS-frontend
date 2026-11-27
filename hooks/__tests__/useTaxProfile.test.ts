import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useTaxProfile,
  maskTaxId,
  getCountryHelpText,
  getDefaultFormForCountry,
  TAX_STORAGE_KEY,
} from "@/hooks/useTaxProfile";

describe("useTaxProfile & Tax Utilities (Issue #759)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("maskTaxId", () => {
    it("returns empty string for empty input", () => {
      expect(maskTaxId("")).toBe("");
      expect(maskTaxId("   ")).toBe("");
    });

    it("masks short numbers with 4 bullets", () => {
      expect(maskTaxId("123")).toBe("••••");
      expect(maskTaxId("1234")).toBe("••••");
    });

    it("masks standard TIN showing only the last 4 characters", () => {
      expect(maskTaxId("123456789")).toBe("••••••6789");
      expect(maskTaxId("12-3456789")).toBe("••••••6789");
      expect(maskTaxId("DE123456789")).toBe("••••••6789");
    });
  });

  describe("getCountryHelpText & getDefaultFormForCountry", () => {
    it("suggests W-9 for United States", () => {
      expect(getDefaultFormForCountry("US")).toBe("W-9");
      expect(getDefaultFormForCountry("United States")).toBe("W-9");
      expect(getCountryHelpText("US")).toContain("W-9");
    });

    it("suggests W-8BEN for foreign countries", () => {
      expect(getDefaultFormForCountry("Germany")).toBe("W-8BEN");
      expect(getDefaultFormForCountry("UK")).toBe("W-8BEN");
      expect(getCountryHelpText("Germany")).toContain("W-8BEN");
    });
  });

  describe("useTaxProfile hook", () => {
    it("initializes with missing status when no profile is stored", () => {
      const { result } = renderHook(() => useTaxProfile());
      expect(result.current.status).toBe("missing");
      expect(result.current.isMissing).toBe(true);
      expect(result.current.canClaimPayout).toBe(false);
      expect(result.current.payoutBlockReason).toContain("required");
    });

    it("validates required fields on submission", () => {
      const { result } = renderHook(() => useTaxProfile());

      expect(() => {
        result.current.saveTaxProfile({
          country: "",
          tin: "123456789",
          formType: "W-9",
          certified: true,
        });
      }).toThrow("Country of tax residence is required");

      expect(() => {
        result.current.saveTaxProfile({
          country: "US",
          tin: "",
          formType: "W-9",
          certified: true,
        });
      }).toThrow("Tax Identification Number (TIN) is required");

      expect(() => {
        result.current.saveTaxProfile({
          country: "US",
          tin: "123456789",
          formType: "W-9",
          certified: false,
        });
      }).toThrow("You must certify");
    });

    it("saves profile with masked TIN and updates status to submitted", () => {
      const { result } = renderHook(() => useTaxProfile());

      act(() => {
        result.current.saveTaxProfile({
          country: "United States",
          tin: "123456789",
          formType: "W-9",
          certified: true,
        });
      });

      expect(result.current.status).toBe("submitted");
      expect(result.current.isSubmitted).toBe(true);
      expect(result.current.canClaimPayout).toBe(true);
      expect(result.current.profile?.maskedTin).toBe("••••••6789");
      expect(result.current.payoutBlockReason).toBeNull();

      // Check localStorage storage
      const stored = JSON.parse(localStorage.getItem(TAX_STORAGE_KEY) || "{}");
      expect(stored.maskedTin).toBe("••••••6789");
      expect(stored.country).toBe("United States");
    });

    it("transitions from submitted to verified", () => {
      const { result } = renderHook(() => useTaxProfile());

      act(() => {
        result.current.saveTaxProfile({
          country: "Germany",
          tin: "DE987654321",
          formType: "W-8BEN",
          certified: true,
        });
      });

      expect(result.current.status).toBe("submitted");

      act(() => {
        result.current.verifyTaxProfile();
      });

      expect(result.current.status).toBe("verified");
      expect(result.current.isVerified).toBe(true);
      expect(result.current.profile?.verifiedAt).toBeDefined();
    });

    it("resets tax profile", () => {
      const { result } = renderHook(() => useTaxProfile());

      act(() => {
        result.current.saveTaxProfile({
          country: "Canada",
          tin: "CA123456789",
          formType: "W-8BEN",
          certified: true,
        });
      });
      expect(result.current.status).toBe("submitted");

      act(() => {
        result.current.resetTaxProfile();
      });
      expect(result.current.status).toBe("missing");
      expect(result.current.profile).toBeNull();
      expect(localStorage.getItem(TAX_STORAGE_KEY)).toBeNull();
    });
  });
});
