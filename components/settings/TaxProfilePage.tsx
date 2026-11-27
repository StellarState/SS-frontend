"use client";

import { useState } from "react";
import {
  useTaxProfile,
  getCountryHelpText,
  getDefaultFormForCountry,
  TaxFormType,
} from "@/hooks/useTaxProfile";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function TaxProfilePage() {
  const {
    profile,
    status,
    isMissing,
    isSubmitted,
    isVerified,
    saveTaxProfile,
    verifyTaxProfile,
    resetTaxProfile,
  } = useTaxProfile();

  const [isEditing, setIsEditing] = useState(isMissing);
  const [country, setCountry] = useState(profile?.country || "United States");
  const [tin, setTin] = useState("");
  const [formType, setFormType] = useState<TaxFormType>(
    profile?.formType || getDefaultFormForCountry(country)
  );
  const [certified, setCertified] = useState(profile?.certified || false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleCountryChange = (val: string) => {
    setCountry(val);
    setFormType(getDefaultFormForCountry(val));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      saveTaxProfile({
        country,
        tin,
        formType,
        certified,
      });
      setIsEditing(false);
      setTin("");
      setMessage({ text: "Tax profile saved successfully.", type: "success" });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage({ text: err.message, type: "error" });
      } else {
        setMessage({ text: "Failed to save tax profile.", type: "error" });
      }
    }
  };

  return (
    <div className="space-y-6 max-w-2xl" data-testid="tax-profile-page">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Tax Residency & Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your tax residency, self-certification, and form submissions for invoice yield distributions.
        </p>
      </div>

      {/* Status Banner */}
      {isMissing && (
        <div
          role="status"
          aria-label="Tax profile missing banner"
          data-testid="tax-status-missing"
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200"
        >
          <div className="flex items-start gap-3">
            <span className="text-lg">⚠️</span>
            <div>
              <h3 className="font-semibold text-sm">Action Required: Tax Profile Missing</h3>
              <p className="text-xs mt-1 leading-relaxed">
                You have not submitted a tax profile. Payout claims are locked until a valid tax residency declaration and form are on file.
              </p>
            </div>
          </div>
        </div>
      )}

      {isSubmitted && (
        <div
          role="status"
          aria-label="Tax profile submitted banner"
          data-testid="tax-status-submitted"
          className="rounded-lg border border-blue-500/40 bg-blue-500/10 p-4 text-blue-900 dark:text-blue-200"
        >
          <div className="flex items-start gap-3">
            <span className="text-lg">ℹ️</span>
            <div>
              <h3 className="font-semibold text-sm">Tax Profile Submitted</h3>
              <p className="text-xs mt-1 leading-relaxed">
                Your tax profile has been submitted and is currently pending automated compliance verification. Payouts can proceed under standard treaty terms.
              </p>
            </div>
          </div>
        </div>
      )}

      {isVerified && (
        <div
          role="status"
          aria-label="Tax profile verified banner"
          data-testid="tax-status-verified"
          className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-emerald-900 dark:text-emerald-200"
        >
          <div className="flex items-start gap-3">
            <span className="text-lg">✅</span>
            <div>
              <h3 className="font-semibold text-sm">Tax Profile Verified</h3>
              <p className="text-xs mt-1 leading-relaxed">
                Your tax declaration has been verified. Payouts and yield reporting are fully enabled.
              </p>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div
          className={`rounded-md p-3 text-xs font-medium ${
            message.type === "success"
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              : "bg-destructive/15 text-destructive"
          }`}
        >
          {message.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Tax Declaration Details</CardTitle>
          <CardDescription>
            {isEditing
              ? "Submit or update your tax identification information below."
              : "Current certified tax residency on record."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isEditing && profile ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Country of Residence</p>
                  <p className="font-medium text-foreground">{profile.country}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Form Type</p>
                  <p className="font-medium text-foreground">{profile.formType}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tax Identification Number</p>
                  <p className="font-mono font-medium text-foreground" data-testid="saved-masked-tin">
                    {profile.maskedTin}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="capitalize font-medium text-foreground">{status}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Submitted At</p>
                  <p className="text-foreground">{new Date(profile.submittedAt).toLocaleDateString()}</p>
                </div>
                {profile.verifiedAt && (
                  <div>
                    <p className="text-xs text-muted-foreground">Verified At</p>
                    <p className="text-foreground">{new Date(profile.verifiedAt).toLocaleDateString()}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  Update Tax Profile
                </Button>
                {status === "submitted" && (
                  <Button variant="secondary" size="sm" onClick={verifyTaxProfile}>
                    Simulate Verification
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="text-destructive" onClick={resetTaxProfile}>
                  Clear Data
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="page-tax-country">Country of Residence</Label>
                <Input
                  id="page-tax-country"
                  value={country}
                  placeholder="e.g. United States, United Kingdom, Canada"
                  onChange={(e) => handleCountryChange(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="page-tax-form">Tax Form Type</Label>
                <select
                  id="page-tax-form"
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as TaxFormType)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  <option value="W-9">Form W-9 (US Persons)</option>
                  <option value="W-8BEN">Form W-8BEN (Non-US Individuals)</option>
                  <option value="W-8BEN-E">Form W-8BEN-E (Non-US Entities)</option>
                  <option value="OTHER">Other Form</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">{getCountryHelpText(country)}</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="page-tax-tin">Tax Identification Number (TIN)</Label>
                <Input
                  id="page-tax-tin"
                  type="text"
                  value={tin}
                  placeholder={profile?.maskedTin ? `Current: ${profile.maskedTin} (Enter new to replace)` : "Enter TIN"}
                  onChange={(e) => setTin(e.target.value)}
                  className="font-mono"
                  required={!profile}
                />
                <p className="text-xs text-muted-foreground">
                  The full TIN is never stored or displayed. Only the last four characters are kept.
                </p>
              </div>

              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    id="page-tax-certify"
                    checked={certified}
                    onChange={(e) => setCertified(e.target.checked)}
                    className="h-4 w-4 mt-0.5 rounded border-muted-foreground/40 text-primary"
                  />
                  <span className="text-xs text-muted-foreground">
                    I certify under penalties of perjury that I am the beneficial owner and the information provided is accurate.
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                {profile && (
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                )}
                <Button type="submit" disabled={!certified || (!tin.trim() && !profile) || !country.trim()}>
                  Save Declaration
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
