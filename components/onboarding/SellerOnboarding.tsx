"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Step = "personal" | "business" | "documents" | "review";
const STEPS: Step[] = ["personal", "business", "documents", "review"];
const STEP_LABELS: Record<Step, string> = { personal: "Personal Details", business: "Business Info", documents: "Document Upload", review: "Review & Submit" };

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {STEPS.map((step, i) => (
        <div key={step} className="flex items-center gap-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${i < current ? "bg-green-500 text-white" : i === current ? "border-2 border-primary text-primary" : "border border-muted-foreground/30 text-muted-foreground"}`}>{i < current ? "✓" : i + 1}</div>
          <span className={`text-xs hidden sm:inline ${i === current ? "text-foreground font-medium" : "text-muted-foreground"}`}>{STEP_LABELS[step]}</span>
          {i < STEPS.length - 1 && <div className="h-px w-6 bg-muted-foreground/20" />}
        </div>
      ))}
    </div>
  );
}

export function SellerOnboarding({ onComplete }: { onComplete?: () => void }) {
  const [step, setStep] = useState(0);
  const [personal, setPersonal] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [business, setBusiness] = useState({ businessName: "", businessType: "", registrationNumber: "", country: "" });
  const [documents, setDocuments] = useState({ idDocumentCid: null as string | null, businessRegCid: null as string | null, idFileName: "", bizFileName: "" });

  const submitKyc = useMutation({ mutationFn: async () => { const res = await fetch("/api/kyc/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ personal, business, documents }) }); if (!res.ok) throw new Error("KYC submission failed"); return res.json(); }, onSuccess: () => onComplete?.() });

  const canProceed = (): boolean => {
    switch (STEPS[step]) {
      case "personal": return !!(personal.firstName && personal.lastName && personal.email);
      case "business": return !!(business.businessName && business.country);
      case "documents": return !!(documents.idDocumentCid || documents.idFileName);
      default: return true;
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader><CardTitle>Seller Onboarding</CardTitle><StepIndicator current={step} /></CardHeader>
      <CardContent>
        {STEPS[step] === "personal" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>First Name *</Label><Input value={personal.firstName} onChange={(e) => setPersonal({ ...personal, firstName: e.target.value })} /></div>
              <div><Label>Last Name *</Label><Input value={personal.lastName} onChange={(e) => setPersonal({ ...personal, lastName: e.target.value })} /></div>
            </div>
            <div><Label>Email *</Label><Input type="email" value={personal.email} onChange={(e) => setPersonal({ ...personal, email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={personal.phone} onChange={(e) => setPersonal({ ...personal, phone: e.target.value })} /></div>
          </div>
        )}
        {STEPS[step] === "business" && (
          <div className="space-y-4">
            <div><Label>Business Name *</Label><Input value={business.businessName} onChange={(e) => setBusiness({ ...business, businessName: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Business Type</Label><Input value={business.businessType} onChange={(e) => setBusiness({ ...business, businessType: e.target.value })} /></div>
              <div><Label>Registration Number</Label><Input value={business.registrationNumber} onChange={(e) => setBusiness({ ...business, registrationNumber: e.target.value })} /></div>
            </div>
            <div><Label>Country *</Label><Input value={business.country} onChange={(e) => setBusiness({ ...business, country: e.target.value })} /></div>
          </div>
        )}
        {STEPS[step] === "documents" && (
          <div className="space-y-4">
            <div><Label>ID Document *</Label><Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => { const f = e.target.files?.[0]; if (f) setDocuments({ ...documents, idFileName: f.name, idDocumentCid: `ipfs-${f.name}` }); }} />{documents.idFileName && <p className="text-xs text-green-600 mt-1">Uploaded: {documents.idFileName}</p>}</div>
            <div><Label>Business Registration</Label><Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => { const f = e.target.files?.[0]; if (f) setDocuments({ ...documents, bizFileName: f.name, businessRegCid: `ipfs-${f.name}` }); }} />{documents.bizFileName && <p className="text-xs text-green-600 mt-1">Uploaded: {documents.bizFileName}</p>}</div>
          </div>
        )}
        {STEPS[step] === "review" && (
          <div className="space-y-3 text-sm">
            <div className="rounded-lg bg-muted p-3"><h4 className="font-semibold">Personal</h4><p>{personal.firstName} {personal.lastName} — {personal.email}</p></div>
            <div className="rounded-lg bg-muted p-3"><h4 className="font-semibold">Business</h4><p>{business.businessName} ({business.country})</p></div>
            <div className="rounded-lg bg-muted p-3"><h4 className="font-semibold">Documents</h4><p>ID: {documents.idFileName || "Not uploaded"} | Biz: {documents.bizFileName || "Not uploaded"}</p></div>
          </div>
        )}
        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>Back</Button>
          {step < STEPS.length - 1 ? <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>Next</Button> : <Button onClick={() => submitKyc.mutate()} disabled={submitKyc.isPending}>{submitKyc.isPending ? "Submitting…" : "Submit KYC"}</Button>}
        </div>
      </CardContent>
    </Card>
  );
}
