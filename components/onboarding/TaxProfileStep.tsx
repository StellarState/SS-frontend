"use client";

import { useState } from "react";
import {
  useTaxProfile,
  getCountryHelpText,
  getDefaultFormForCountry,
  TaxFormType,
} from "@/hooks/useTaxProfile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface TaxProfileStepProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function TaxProfileStep({ onSuccess, onCancel }: TaxProfileStepProps) {
  const { profile, saveTaxProfile } = useTaxProfile();
  const [country, setCountry] = useState(profile?.country || "United States");
  const [tin, setTin] = useState("");
  const [formType, setFormType] = useState<TaxFormType>(
    profile?.formType || getDefaultFormForCountry(profile?.country || "United States")
  );
  const [certified, setCertified] = useState(profile?.certified || false);
  const [error, setError] = useState<string | null>(null);

  const handleCountryChange = (newCountry: string) => {
    setCountry(newCountry);
    const suggested = getDefaultFormForCountry(newCountry);
    setFormType(suggested);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!country.trim()) {
      setError("Please select or enter your country of tax residence.");
      return;
    }
    if (!tin.trim()) {
      setError("Tax Identification Number (TIN/SSN/EIN) is required.");
      return;
    }
    if (!certified) {
      setError("You must certify the statements under penalties of perjury.");
      return;
    }

    try {
      saveTaxProfile({
        country: country.trim(),
        tin: tin.trim(),
        formType,
        certified,
      });
      onSuccess?.();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to save tax profile.");
      }
    }
  };

  const helpText = getCountryHelpText(country);

  return (
    <div className="space-y-4 text-sm" data-testid="tax-profile-step">
      <div>
        <h3 className="text-base font-semibold text-foreground">Tax Residency & Form Details</h3>
        <p className="text-xs text-muted-foreground">
          Regulatory compliance requires verified tax residency before yield distributions can be claimed.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-md bg-destructive/15 p-3 text-xs text-destructive font-medium"
        >
          {error}
        </div>
      )}

      {profile && profile.status !== "missing" && (
        <div className="rounded-md bg-muted/60 p-3 text-xs space-y-1">
          <p className="font-medium text-foreground">Current Status: {profile.status.toUpperCase()}</p>
          <p className="text-muted-foreground">
            Saved Tax ID: <span className="font-mono">{profile.maskedTin}</span>
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="tax-country">Country of Tax Residence</Label>
          <Input
            id="tax-country"
            name="country"
            value={country}
            placeholder="e.g. United States, Germany, United Kingdom"
            onChange={(e) => handleCountryChange(e.target.value)}
            className="w-full"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tax-form-type">Tax Form Type</Label>
          <select
            id="tax-form-type"
            name="formType"
            value={formType}
            onChange={(e) => setFormType(e.target.value as TaxFormType)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="W-9">Form W-9 (US Persons / Entities)</option>
            <option value="W-8BEN">Form W-8BEN (Non-US Individuals)</option>
            <option value="W-8BEN-E">Form W-8BEN-E (Non-US Entities)</option>
            <option value="OTHER">Other Applicable Form</option>
          </select>
          <p className="text-xs text-muted-foreground mt-1" data-testid="tax-help-text">
            {helpText}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tax-tin">
            Tax Identification Number (TIN / SSN / EIN)
          </Label>
          <Input
            id="tax-tin"
            name="tin"
            type="text"
            value={tin}
            placeholder="Enter TIN (masked upon saving)"
            onChange={(e) => setTin(e.target.value)}
            autoComplete="off"
            className="w-full font-mono"
            required
          />
          <p className="text-[11px] text-muted-foreground">
            Your TIN is encrypted and masked. Only the last four characters will be shown once saved.
          </p>
        </div>

        <div className="pt-2">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              id="tax-certify"
              name="certified"
              checked={certified}
              onChange={(e) => setCertified(e.target.checked)}
              className="h-4 w-4 mt-0.5 rounded border-muted-foreground/40 text-primary focus:ring-primary"
            />
            <span className="text-xs text-muted-foreground leading-snug">
              Under penalties of perjury, I certify that the tax identification number provided is correct,
              I am the beneficial owner of the funds, and I am authorized to submit this declaration.
            </span>
          </label>
        </div>

        <div className="flex justify-between items-center pt-3">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" className="ml-auto" disabled={!certified || !tin.trim() || !country.trim()}>
            Save & Continue
          </Button>
        </div>
      </form>
    </div>
  );
}
