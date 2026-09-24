"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Step = "personal" | "business" | "documents" | "review";

interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface BusinessInfo {
  businessName: string;
  businessType: string;
  registrationNumber: string;
  country: string;
}

interface DocumentInfo {
  idDocumentCid: string | null;
  businessRegCid: string | null;
  idFileName: string;
  bizFileName: string;
}

const STEPS: Step[] = ["personal", "business", "documents", "review"];
const STEP_LABELS: Record<Step, string> = {
  personal: "Personal Details",
  business: "Business Info",
  documents: "Document Upload",
  review: "Review & Submit",
};

function StepIndicator({ current, steps }: { current: number; steps: Step[] }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
              i < current
                ? "bg-green-500 text-white"
                : i === current
                  ? "border-2 border-primary text-primary"
                  : "border border-muted-foreground/30 text-muted-foreground"
            }`}
          >
            {i < current ? "✓" : i + 1}
          </div>
          <span className={`text-xs hidden sm:inline ${i === current ? "text-foreground font-medium" : "text-muted-foreground"}`}>
            {STEP_LABELS[step]}
          </span>
          {i < steps.length - 1 && <div className="h-px w-6 bg-muted-foreground/20" />}
        </div>
      ))}
    </div>
  );
}

/**
 * #286 — Multi-step seller onboarding with KYC document submission.
 * Collects personal info, business info, document uploads (IPFS CIDs),
 * and submits the KYC payload to the backend.
 */
export function SellerOnboarding({ onComplete }: { onComplete?: () => void }) {
  const [step, setStep] = useState(0);
  const [personal, setPersonal] = useState<PersonalInfo>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [business, setBusiness] = useState<BusinessInfo>({
    businessName: "",
    businessType: "",
    registrationNumber: "",
    country: "",
  });
  const [documents, setDocuments] = useState<DocumentInfo>({
    idDocumentCid: null,
    businessRegCid: null,
    idFileName: "",
    bizFileName: "",
  });

  const submitKyc = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/kyc/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personal, business, documents }),
      });
      if (!res.ok) throw new Error("KYC submission failed");
      return res.json();
    },
    onSuccess: () => onComplete?.(),
  });

  const canProceed = (): boolean => {
    switch (STEPS[step]) {
      case "personal":
        return !!(personal.firstName && personal.lastName && personal.email);
      case "business":
        return !!(business.businessName && business.country);
      case "documents":
        return !!(documents.idDocumentCid || documents.idFileName);
      case "review":
        return true;
      default:
        return false;
    }
  };

  const handleFileUpload = async (file: File, type: "id" | "business") => {
    // In production, upload to IPFS via Pinata. For now, store filename.
    if (type === "id") {
      setDocuments((d) => ({ ...d, idFileName: file.name, idDocumentCid: `ipfs-placeholder-${file.name}` }));
    } else {
      setDocuments((d) => ({ ...d, bizFileName: file.name, businessRegCid: `ipfs-placeholder-${file.name}` }));
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Seller Onboarding</CardTitle>
        <StepIndicator current={step} steps={STEPS} />
      </CardHeader>
      <CardContent>
        {/* Step 1: Personal */}
        {STEPS[step] === "personal" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input id="firstName" value={personal.firstName} onChange={(e) => setPersonal({ ...personal, firstName: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input id="lastName" value={personal.lastName} onChange={(e) => setPersonal({ ...personal, lastName: e.target.value })} />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={personal.email} onChange={(e) => setPersonal({ ...personal, email: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={personal.phone} onChange={(e) => setPersonal({ ...personal, phone: e.target.value })} />
            </div>
          </div>
        )}

        {/* Step 2: Business */}
        {STEPS[step] === "business" && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="businessName">Business Name *</Label>
              <Input id="businessName" value={business.businessName} onChange={(e) => setBusiness({ ...business, businessName: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="businessType">Business Type</Label>
                <Input id="businessType" value={business.businessType} onChange={(e) => setBusiness({ ...business, businessType: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="registrationNumber">Registration Number</Label>
                <Input id="registrationNumber" value={business.registrationNumber} onChange={(e) => setBusiness({ ...business, registrationNumber: e.target.value })} />
              </div>
            </div>
            <div>
              <Label htmlFor="country">Country *</Label>
              <Input id="country" value={business.country} onChange={(e) => setBusiness({ ...business, country: e.target.value })} />
            </div>
          </div>
        )}

        {/* Step 3: Documents */}
        {STEPS[step] === "documents" && (
          <div className="space-y-4">
            <div>
              <Label>ID Document *</Label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileUpload(f, "id");
                }}
              />
              {documents.idFileName && <p className="text-xs text-green-600 mt-1">Uploaded: {documents.idFileName}</p>}
            </div>
            <div>
              <Label>Business Registration</Label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileUpload(f, "business");
                }}
              />
              {documents.bizFileName && <p className="text-xs text-green-600 mt-1">Uploaded: {documents.bizFileName}</p>}
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {STEPS[step] === "review" && (
          <div className="space-y-4 text-sm">
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <h4 className="font-semibold">Personal</h4>
              <p>{personal.firstName} {personal.lastName} — {personal.email}</p>
            </div>
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <h4 className="font-semibold">Business</h4>
              <p>{business.businessName} ({business.country})</p>
            </div>
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <h4 className="font-semibold">Documents</h4>
              <p>ID: {documents.idFileName || "Not uploaded"} | Business: {documents.bizFileName || "Not uploaded"}</p>
            </div>
            {submitKyc.isError && <p className="text-sm text-red-500">Submission failed. Please try again.</p>}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
              Next
            </Button>
          ) : (
            <Button onClick={() => submitKyc.mutate()} disabled={submitKyc.isPending}>
              {submitKyc.isPending ? "Submitting…" : "Submit KYC"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
