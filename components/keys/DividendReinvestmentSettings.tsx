"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { confirmDividendReinvestment, fetchKeyReinvestmentSettings, previewDividendReinvestment, saveKeyReinvestmentSettings } from "@/lib/api";

export function DividendReinvestmentSettings({ keyId }: { keyId: string }) {
  const { jwt } = useAuth();
  const client = useQueryClient();
  const [amount, setAmount] = useState("");
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewDividendReinvestment>> | null>(null);
  const [message, setMessage] = useState("");
  const queryKey = ["dividend-reinvestment", keyId] as const;
  const { data, isLoading, isError } = useQuery({ queryKey, queryFn: () => fetchKeyReinvestmentSettings(keyId, jwt ?? undefined) });
  const settingsMutation = useMutation({
    mutationFn: (next: { enabled: boolean; defaultEnabled: boolean }) => saveKeyReinvestmentSettings(keyId, next, jwt ?? undefined),
    onSuccess: (next) => { client.setQueryData(queryKey, next); setMessage("Settings saved. You can change them at any time."); },
    onError: () => setMessage("Settings could not be saved."),
  });
  const previewMutation = useMutation({
    mutationFn: () => previewDividendReinvestment(keyId, Number(amount), jwt ?? undefined),
    onSuccess: (result) => { setPreview(result); setMessage(""); },
    onError: () => { setPreview(null); setMessage("Could not preview this distribution. No funds were moved."); },
  });
  const confirmMutation = useMutation({
    mutationFn: () => confirmDividendReinvestment(keyId, preview!.distributionAmount, jwt ?? undefined),
    onSuccess: async (result) => {
      setPreview(null);
      setAmount("");
      setMessage(result.success ? "Reinvestment submitted. Activity will appear in wallet history." : `Reinvestment was not completed; ${result.availableAmount} XLM remains available as cash.`);
      await client.invalidateQueries({ queryKey: ["wallet-activity"] });
      await client.invalidateQueries({ queryKey: queryKey });
    },
    onError: () => { setPreview(null); setMessage("Reinvestment failed. Your dividend remains available as cash."); },
  });

  return <Card data-testid="dividend-reinvestment-settings">
    <CardHeader><h2 className="text-lg font-semibold">Dividend reinvestment</h2><p className="text-sm text-muted-foreground">Opt in per key, preview each distribution, and confirm before buying more keys.</p></CardHeader>
    <CardContent className="space-y-5">
      {isLoading ? <p role="status">Loading preferences…</p> : isError || !data ? <p role="alert" className="text-sm text-destructive">Reinvestment settings are unavailable.</p> : <>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="reinvest-key">Reinvest dividends for this key</Label>
          <Switch id="reinvest-key" checked={data.enabled} disabled={settingsMutation.isPending} onCheckedChange={(enabled) => settingsMutation.mutate({ ...data, enabled })} />
        </div>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="reinvest-default">Use as my default for future keys</Label>
          <Switch id="reinvest-default" checked={data.defaultEnabled} disabled={settingsMutation.isPending} onCheckedChange={(defaultEnabled) => settingsMutation.mutate({ ...data, defaultEnabled })} />
        </div>
      </>}
      <form className="space-y-3 border-t pt-4" onSubmit={(event) => { event.preventDefault(); setPreview(null); previewMutation.mutate(); }}>
        <Label htmlFor="reinvest-amount">Distribution amount (XLM)</Label>
        <div className="flex gap-2"><Input id="reinvest-amount" type="number" min="0.0000001" step="any" value={amount} onChange={(event) => setAmount(event.target.value)} required />
          <Button type="submit" variant="outline" disabled={previewMutation.isPending || Number(amount) <= 0}>Preview</Button></div>
      </form>
      {preview && <div className="space-y-2 rounded-md border p-3" data-testid="reinvestment-confirmation">
        <p className="font-medium">Review this distribution</p>
        <dl className="grid grid-cols-2 gap-1 text-sm"><dt>Dividend</dt><dd>{preview.distributionAmount.toLocaleString()} XLM</dd><dt>Estimated keys</dt><dd>{preview.expectedKeys.toLocaleString()}</dd><dt>Estimated fees</dt><dd>{preview.estimatedFee.toLocaleString()} XLM</dd></dl>
        <p className="text-xs text-muted-foreground">If the purchase fails, the full dividend remains available as cash.</p>
        <div className="flex gap-2"><Button type="button" onClick={() => confirmMutation.mutate()} disabled={confirmMutation.isPending}>{confirmMutation.isPending ? "Confirming…" : "Confirm reinvestment"}</Button><Button type="button" variant="outline" onClick={() => setPreview(null)}>Cancel</Button></div>
      </div>}
      {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
    </CardContent>
  </Card>;
}
