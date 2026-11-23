"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { fetchSellerTaxProfile, saveSellerTaxProfile } from "@/lib/api";

const PROFILE_KEY = ["seller-tax-profile"] as const;

export function SellerTaxProfileSettings({ previewAmount = 0 }: { previewAmount?: number }) {
  const queryClient = useQueryClient();
  const { data: profile, isLoading, isError } = useQuery({ queryKey: PROFILE_KEY, queryFn: () => fetchSellerTaxProfile() });
  const [entityType, setEntityType] = useState("");
  const [taxId, setTaxId] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [residenceCountry, setResidenceCountry] = useState("");
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: saveSellerTaxProfile,
    onSuccess: async (saved) => { setTaxId(""); setError(""); await queryClient.setQueryData(PROFILE_KEY, saved); },
    onError: () => setError("Profile could not be saved. Check the jurisdiction details and try again."),
  });

  const entity = entityType || profile?.entityType || "";
  const region = jurisdiction || profile?.jurisdiction || "";
  const residence = residenceCountry || profile?.residenceCountry || "";
  const complete = Boolean(profile?.complete);
  const withholding = profile?.withholdingRate;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!entity || !region || !residence || !taxId.trim()) {
      setError("Complete all fields to save your tax profile.");
      return;
    }
    mutation.mutate({ entityType: entity, jurisdiction: region, residenceCountry: residence, taxId: taxId.trim() });
  }

  return <Card data-testid="seller-tax-profile">
    <CardHeader><h2 className="text-lg font-semibold">Tax profile and withholding</h2>
      <p className="text-sm text-muted-foreground">Tax IDs are hidden after saving. Jurisdiction rules are validated by the payout service.</p>
    </CardHeader>
    <CardContent className="space-y-4">
      {isLoading ? <p role="status" className="text-sm text-muted-foreground">Loading tax profile…</p> : isError ?
        <p role="alert" className="text-sm text-destructive">Could not load your tax profile.</p> : <>
          <p className="text-sm" data-testid="tax-profile-status">Payout eligibility: <strong>{complete ? "Eligible" : "Blocked until profile is complete"}</strong>
            {profile?.taxIdLast4 && <span className="ml-2 text-muted-foreground" data-testid="masked-tax-id">Tax ID ending in •••• {profile.taxIdLast4}</span>}
          </p>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="tax-entity">Entity type</Label><Input id="tax-entity" value={entity} onChange={(e) => setEntityType(e.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="tax-jurisdiction">Tax jurisdiction</Label><Input id="tax-jurisdiction" value={region} onChange={(e) => setJurisdiction(e.target.value)} placeholder="Country or region" required /></div>
            <div className="space-y-2"><Label htmlFor="tax-residence">Residence country</Label><Input id="tax-residence" value={residence} onChange={(e) => setResidenceCountry(e.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="tax-id">Tax ID</Label><Input id="tax-id" type="password" autoComplete="off" value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder={profile?.taxIdLast4 ? `Replace saved ID ending ${profile.taxIdLast4}` : "Enter tax ID"} required /></div>
            <div className="sm:col-span-2"><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Saving…" : "Save tax profile"}</Button></div>
          </form>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {complete && withholding !== null && withholding !== undefined && <div className="rounded-md border p-3" data-testid="withholding-preview">
            <p className="font-medium">Estimated withholding preview</p>
            <p className="text-sm text-muted-foreground">{withholding}% · {previewAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} XLM payout → {(previewAmount * withholding / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })} XLM withheld</p>
            <p className="mt-1 text-xs text-muted-foreground">Estimate supplied by your jurisdiction’s payout rules; final withholding is confirmed on the statement.</p>
          </div>}
        </>}
    </CardContent>
  </Card>;
}
