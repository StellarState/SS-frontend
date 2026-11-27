"use client";

import { useState, useEffect, useCallback } from "react";

export type TaxFormType = "W-9" | "W-8BEN" | "W-8BEN-E" | "OTHER";
export type TaxProfileStatus = "missing" | "submitted" | "verified";

export interface TaxProfileData {
  country: string;
  maskedTin: string;
  formType: TaxFormType;
  certified: boolean;
  status: TaxProfileStatus;
  submittedAt: string;
  verifiedAt?: string;
}

export const TAX_STORAGE_KEY = "ss_tax_profile";

/**
 * Mask a Taxpayer Identification Number, showing only the last 4 characters.
 * Never displays or persists full unmasked numbers.
 */
export function maskTaxId(rawTin: string): string {
  const trimmed = rawTin.trim();
  if (!trimmed) return "";
  if (trimmed.length <= 4) {
    return "••••";
  }
  const lastFour = trimmed.slice(-4);
  return `••••••${lastFour}`;
}

/**
 * Country-specific regulatory help text explaining required tax forms.
 */
export function getCountryHelpText(country: string): string {
  const norm = country.trim().toUpperCase();
  if (norm === "US" || norm === "USA" || norm === "UNITED STATES") {
    return "US persons (citizens, permanent residents, and domestic entities) must submit Form W-9 to certify their TIN (SSN or EIN) for IRS interest and yield reporting.";
  }
  if (norm === "GB" || norm === "UK" || norm === "UNITED KINGDOM" || norm === "DE" || norm === "GERMANY" || norm === "CA" || norm === "CANADA" || norm === "FR" || norm === "FRANCE") {
    return "Non-US individual investors must submit Form W-8BEN to certify foreign status and claim applicable bilateral tax treaty withholding rates.";
  }
  return "Non-US investors must submit Form W-8BEN (individuals) or Form W-8BEN-E (entities) to certify foreign tax residency before receiving invoice factoring distributions.";
}

/**
 * Suggest recommended tax form for a selected country.
 */
export function getDefaultFormForCountry(country: string): TaxFormType {
  const norm = country.trim().toUpperCase();
  if (norm === "US" || norm === "USA" || norm === "UNITED STATES") {
    return "W-9";
  }
  return "W-8BEN";
}

export function useTaxProfile() {
  const [profile, setProfile] = useState<TaxProfileData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadProfile = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(TAX_STORAGE_KEY);
      if (stored) {
        setProfile(JSON.parse(stored) as TaxProfileData);
      } else {
        setProfile(null);
      }
    } catch {
      setProfile(null);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const saveTaxProfile = useCallback(
    (input: {
      country: string;
      tin: string;
      formType: TaxFormType;
      certified: boolean;
    }): TaxProfileData => {
      if (!input.country.trim()) {
        throw new Error("Country of tax residence is required");
      }
      if (!input.tin.trim()) {
        throw new Error("Tax Identification Number (TIN) is required");
      }
      if (!input.certified) {
        throw new Error("You must certify the tax statements before submitting");
      }

      const newProfile: TaxProfileData = {
        country: input.country.trim(),
        maskedTin: maskTaxId(input.tin),
        formType: input.formType,
        certified: true,
        status: "submitted",
        submittedAt: new Date().toISOString(),
      };

      if (typeof window !== "undefined") {
        localStorage.setItem(TAX_STORAGE_KEY, JSON.stringify(newProfile));
      }
      setProfile(newProfile);
      return newProfile;
    },
    []
  );

  const verifyTaxProfile = useCallback(() => {
    setProfile((prev) => {
      if (!prev) return null;
      const updated: TaxProfileData = {
        ...prev,
        status: "verified",
        verifiedAt: new Date().toISOString(),
      };
      if (typeof window !== "undefined") {
        localStorage.setItem(TAX_STORAGE_KEY, JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  const resetTaxProfile = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(TAX_STORAGE_KEY);
    }
    setProfile(null);
  }, []);

  const status: TaxProfileStatus = profile ? profile.status : "missing";
  const isMissing = status === "missing";
  const isSubmitted = status === "submitted";
  const isVerified = status === "verified";
  const canClaimPayout = !isMissing;
  const payoutBlockReason = isMissing
    ? "Tax residency and tax form collection are required before claiming invoice factoring payouts. Please complete your tax profile in Settings or Onboarding."
    : null;

  return {
    profile,
    status,
    isLoaded,
    isMissing,
    isSubmitted,
    isVerified,
    canClaimPayout,
    payoutBlockReason,
    saveTaxProfile,
    verifyTaxProfile,
    resetTaxProfile,
    reloadProfile: loadProfile,
  };
}
