"use client";

import React, { useState } from "react";
import { useKycExpiry, UseKycExpiryOptions } from "@/hooks/useKycExpiry";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Lock,
  FileCheck2,
  Bell,
  BellOff,
  ArrowRight,
  Info,
} from "lucide-react";

export interface KycExpiryBannerProps {
  initialOptions?: UseKycExpiryOptions;
}

export function KycExpiryBanner({ initialOptions }: KycExpiryBannerProps) {
  const {
    profile,
    expiryState,
    daysRemaining,
    countdownFormatted,
    activeRestrictions,
    notificationsActive,
    checkAction,
    submitRenewal,
    isReverifying,
    simulateState,
  } = useKycExpiry(initialOptions);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFileLabel, setNewFileLabel] = useState("");
  const [newExpiryDate, setNewExpiryDate] = useState("2027-11-22");
  const [blockedActionReason, setBlockedActionReason] = useState<string | null>(null);

  const handleTestRestrictedAction = (actionKey: string) => {
    const res = checkAction(actionKey);
    if (!res.allowed) {
      setBlockedActionReason(res.reason || "Action blocked due to expiring KYC accreditation.");
    } else {
      setBlockedActionReason(null);
    }
  };

  const handleRenewalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileLabel.trim()) return;

    submitRenewal({
      newDocumentFile: newFileLabel,
      newExpiresAt: new Date(newExpiryDate).toISOString(),
    });
    setIsModalOpen(false);
    setBlockedActionReason(null);
  };

  const isGraceOrExpired = expiryState === "grace_period_7" || expiryState === "expired";

  return (
    <div className="space-y-4" data-testid="kyc-expiry-container">
      {/* Top Banner (User-Specific) */}
      <div
        className={`p-4 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
          expiryState === "renewed_pending"
            ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500/40 text-emerald-900 dark:text-emerald-200"
            : expiryState === "expired"
            ? "bg-destructive/10 border-destructive/40 text-destructive"
            : expiryState === "grace_period_7"
            ? "bg-orange-50 dark:bg-orange-950/20 border-orange-500/40 text-orange-900 dark:text-orange-200"
            : "bg-amber-50 dark:bg-amber-950/20 border-amber-500/40 text-amber-900 dark:text-amber-200"
        }`}
        data-testid="kyc-expiry-banner"
      >
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-sm flex items-center gap-1.5" data-testid="user-banner-title">
              {expiryState === "expired" ? (
                <ShieldAlert className="w-4 h-4 text-destructive" />
              ) : expiryState === "renewed_pending" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <Clock className="w-4 h-4 text-amber-600" />
              )}
              {profile.userName} &bull; {profile.preservedFields.legalEntityName}
            </span>

            {/* Timezone-aware Countdown Badge */}
            <Badge
              variant={expiryState === "expired" ? "destructive" : "outline"}
              className="font-mono text-xs"
              data-testid="timezone-countdown-badge"
            >
              <Clock className="w-3 h-3 mr-1" />
              {countdownFormatted}
            </Badge>

            {/* Notification Status */}
            {notificationsActive ? (
              <Badge variant="secondary" className="text-[10px] flex items-center gap-1" data-testid="badge-notifications-active">
                <Bell className="w-3 h-3 text-amber-600" />
                Active Reminders (30d, 14d, 7d)
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-muted-foreground flex items-center gap-1" data-testid="badge-notifications-silenced">
                <BellOff className="w-3 h-3" />
                Reminders Silenced
              </Badge>
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-0.5">
            {expiryState === "renewed_pending"
              ? "Re-verification submitted. Your verified fields remain active while renewal review completes."
              : expiryState === "expired"
              ? `Your ${profile.documentType} has expired. Restricted protocol actions are blocked.`
              : `Your ${profile.documentType} expires in ${daysRemaining} days. Fast-track re-verification to maintain uninterrupted issuing.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {expiryState !== "renewed_pending" && (
            <Button
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className={expiryState === "expired" ? "bg-destructive hover:bg-destructive/90" : ""}
              data-testid="btn-open-reverification"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Fast-Track Re-Verification
            </Button>
          )}

          {/* Scenario Switching for Verification */}
          <div className="flex items-center border rounded-md p-0.5 bg-background text-xs">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => simulateState("30_days")}
              data-testid="btn-sim-30d"
            >
              30d
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => simulateState("grace_7")}
              data-testid="btn-sim-grace7"
            >
              7d Grace
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => simulateState("expired")}
              data-testid="btn-sim-expired"
            >
              Expired
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => simulateState("renewed")}
              data-testid="btn-sim-renewed"
            >
              Renewed
            </Button>
          </div>
        </div>
      </div>

      {/* Expiry Reason Alert for Blocked Actions */}
      {blockedActionReason && (
        <Alert variant="destructive" data-testid="blocked-action-alert">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-xs font-semibold">Action Restricted</AlertTitle>
          <AlertDescription className="text-xs">{blockedActionReason}</AlertDescription>
        </Alert>
      )}

      {/* Restricted Actions Demonstration Panel */}
      {isGraceOrExpired && (
        <Card data-testid="restricted-actions-panel">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-destructive flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              Enforced Action Restrictions ({activeRestrictions.length} operations locked)
            </CardTitle>
            <CardDescription className="text-xs">
              Actions restricted during the final grace window show clear, actionable expiry reasoning.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => handleTestRestrictedAction("create_new_invoice")}
                data-testid="btn-test-create-invoice"
              >
                Attempt New Invoice Issuance
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => handleTestRestrictedAction("increase_credit_line")}
                data-testid="btn-test-credit-line"
              >
                Attempt Credit Increase
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Re-Verification Modal / Focus Flow */}
      {isModalOpen && (
        <Card className="border-2 border-primary/50 shadow-lg" data-testid="reverification-modal">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-primary" />
                Focused KYC Re-Verification ({profile.documentType})
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                Time-Saving Fast-Track
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Accepted historical compliance records are preserved. Only upload updated proof of accreditation.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Preserved Verified Fields */}
            <div className="p-3 rounded-lg border bg-muted/40 space-y-2 text-xs" data-testid="preserved-fields-box">
              <div className="font-semibold text-muted-foreground flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" />
                Preserved &amp; Locked Verified Fields (No Re-entry Needed)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                <div>
                  <span className="text-muted-foreground">Legal Entity: </span>
                  <strong data-testid="preserved-entity-name">{profile.preservedFields.legalEntityName}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Tax Identifier: </span>
                  <strong data-testid="preserved-tax-id">{profile.preservedFields.taxId}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Jurisdiction: </span>
                  <strong>{profile.preservedFields.jurisdiction}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Registered Address: </span>
                  <strong>{profile.preservedFields.registeredAddress}</strong>
                </div>
              </div>
            </div>

            {/* Focused Upload Form */}
            <form onSubmit={handleRenewalSubmit} className="space-y-3 text-xs">
              <div className="space-y-1">
                <Label className="text-xs">Updated Document File</Label>
                <Input
                  placeholder="e.g. Incumbency_Certificate_2027_Signed.pdf"
                  value={newFileLabel}
                  onChange={(e) => setNewFileLabel(e.target.value)}
                  className="h-8 text-xs"
                  data-testid="input-renewal-file"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">New Accreditation Expiration Date</Label>
                <Input
                  type="date"
                  value={newExpiryDate}
                  onChange={(e) => setNewExpiryDate(e.target.value)}
                  className="h-8 text-xs"
                  data-testid="input-renewal-expiry"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isReverifying || !newFileLabel.trim()}
                  data-testid="btn-submit-renewal"
                >
                  Submit Re-Verification
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
