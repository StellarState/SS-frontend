"use client";

import React, { useState } from "react";
import {
  useRecoveryReadiness,
  UseRecoveryReadinessOptions,
} from "@/hooks/useRecoveryReadiness";
import { formatCooldownRemaining } from "@/lib/security/recoveryReadiness";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  ShieldCheck,
  ShieldAlert,
  Shield,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lock,
  ArrowRight,
  XCircle,
  KeyRound,
  RotateCcw,
  Sparkles,
} from "lucide-react";

export interface WalletRecoverySettingsProps {
  initialOptions?: UseRecoveryReadinessOptions;
}

export function WalletRecoverySettings({
  initialOptions,
}: WalletRecoverySettingsProps) {
  const {
    controls,
    score,
    tier,
    currentRecoveryAddress,
    activeCooldown,
    isCooldownDone,
    actionError,
    actionSuccess,
    toggleControlItem,
    initiateAddressUpdate,
    cancelAddressUpdate,
    finalizeAddressUpdate,
    simulateCooldownComplete,
  } = useRecoveryReadiness(initialOptions);

  const [newTargetAddress, setNewTargetAddress] = useState("");

  const handleStartCooldown = () => {
    if (!newTargetAddress.trim()) return;
    const res = initiateAddressUpdate(newTargetAddress);
    if (res.success) {
      setNewTargetAddress("");
    }
  };

  const getTierBadge = () => {
    switch (tier) {
      case "robust":
        return (
          <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-xs" data-testid="tier-badge-robust">
            <ShieldCheck className="w-3.5 h-3.5 mr-1" />
            Robust Security
          </Badge>
        );
      case "moderate":
        return (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 text-xs" data-testid="tier-badge-moderate">
            <Shield className="w-3.5 h-3.5 mr-1 text-amber-600" />
            Moderate Readiness
          </Badge>
        );
      case "critical":
        return (
          <Badge variant="destructive" className="text-xs" data-testid="tier-badge-critical">
            <ShieldAlert className="w-3.5 h-3.5 mr-1" />
            Critical - Action Required
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6" data-testid="wallet-recovery-settings">
      {/* Strict Zero-Secret Security Guarantee */}
      <Alert className="border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200" data-testid="zero-secret-guarantee">
        <Lock className="h-4 w-4 text-emerald-600" />
        <AlertTitle className="font-semibold text-xs">Zero-Secret Policy &amp; Security Assurance</AlertTitle>
        <AlertDescription className="text-xs mt-1">
          StellarSettle <strong>never requests or displays your 12/24-word recovery phrase or private keys</strong>.
          Recovery readiness relies strictly on multi-signature guardians, verified timelocks, and physical hardware keys.
        </AlertDescription>
      </Alert>

      {/* Notifications */}
      {actionError && (
        <Alert variant="destructive" data-testid="recovery-error-alert">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Action Blocked</AlertTitle>
          <AlertDescription className="text-xs">{actionError}</AlertDescription>
        </Alert>
      )}

      {actionSuccess && (
        <Alert className="border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200" data-testid="recovery-success-alert">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertTitle className="font-semibold text-xs">Success</AlertTitle>
          <AlertDescription className="text-xs">{actionSuccess}</AlertDescription>
        </Alert>
      )}

      {/* Readiness Score Card */}
      <Card data-testid="readiness-score-card">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold">Wallet Recovery Readiness Score</CardTitle>
              <CardDescription className="text-xs">
                Post-breach and lost-device survivability posture based on confirmed controls.
              </CardDescription>
            </div>
            {getTierBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold font-mono" data-testid="score-value">
              {score}%
            </span>
            <span className="text-xs text-muted-foreground">
              {tier === "robust"
                ? "Full account guardian coverage active."
                : "Configure remaining controls to achieve 100% readiness."}
            </span>
          </div>
          <Progress
            value={score}
            className={`h-2.5 ${
              score >= 80
                ? "[&>div]:bg-emerald-600"
                : score >= 50
                ? "[&>div]:bg-amber-500"
                : "[&>div]:bg-destructive"
            }`}
            data-testid="score-progress"
          />
        </CardContent>
      </Card>

      {/* Interactive Recovery Checklist (Updates Immediately) */}
      <Card data-testid="recovery-checklist-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Recovery Controls Checklist</CardTitle>
          <CardDescription className="text-xs">
            Toggle and configure independent controls to protect against single points of failure.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {controls.map((control) => (
            <div
              key={control.id}
              className="p-3.5 rounded-lg border bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
              data-testid={`control-item-${control.id}`}
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-foreground">{control.title}</span>
                  <Badge variant="outline" className="text-[10px]">
                    +{control.weight}%
                  </Badge>
                  {control.isConfigured ? (
                    <Badge variant="default" className="bg-emerald-600 text-[10px]">
                      Configured
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">
                      Pending
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{control.description}</p>
                {control.details && (
                  <div className="text-[11px] text-muted-foreground font-mono pt-0.5">
                    Status: {control.details}
                  </div>
                )}
              </div>

              <Button
                variant={control.isConfigured ? "outline" : "default"}
                size="sm"
                className="text-xs whitespace-nowrap self-start sm:self-auto"
                onClick={() => toggleControlItem(control.id)}
                data-testid={`btn-toggle-${control.id}`}
              >
                {control.isConfigured ? "Disable Control" : "Activate Control"}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recovery Address & Timelock Cooldown Panel */}
      <Card data-testid="recovery-cooldown-panel">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Recovery Address &amp; Cooldown Timelock
          </CardTitle>
          <CardDescription className="text-xs">
            To prevent hostile account takeovers, all recovery address adjustments require a mandatory 48-hour timelock.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Recovery Address */}
          <div className="p-3 rounded-md bg-muted/40 border text-xs space-y-1">
            <span className="text-muted-foreground">Current Active Recovery Guardian:</span>
            <div className="font-mono font-semibold break-all" data-testid="current-recovery-address">
              {currentRecoveryAddress || "No recovery address currently assigned"}
            </div>
          </div>

          {/* Active Cooldown Banner */}
          {activeCooldown && (
            <div
              className="p-4 rounded-lg border-2 border-amber-500/40 bg-amber-50 dark:bg-amber-950/20 space-y-3"
              data-testid="active-cooldown-box"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                  Security Cooldown in Progress ({activeCooldown.cooldownHours}h Window)
                </span>
                <Badge variant="outline" className="text-amber-700 border-amber-500 text-[10px]">
                  {formatCooldownRemaining(activeCooldown.cooldownEndsAt)}
                </Badge>
              </div>

              <div className="text-xs space-y-1 text-muted-foreground">
                <div>
                  Requested Target Address:{" "}
                  <strong className="font-mono text-foreground break-all" data-testid="pending-target-address">
                    {activeCooldown.pendingAddress}
                  </strong>
                </div>
                <div>
                  Timelock completion: {new Date(activeCooldown.cooldownEndsAt).toLocaleString()}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  size="sm"
                  variant="default"
                  disabled={!isCooldownDone}
                  onClick={finalizeAddressUpdate}
                  data-testid="btn-finalize-cooldown"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  Finalize &amp; Apply Recovery Address
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={cancelAddressUpdate}
                  data-testid="btn-cancel-cooldown"
                >
                  Cancel Change Request
                </Button>

                {/* Developer / Testing Simulator Button */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={simulateCooldownComplete}
                  className="text-xs text-muted-foreground"
                  data-testid="btn-simulate-cooldown-expire"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Fast-Forward Cooldown (Test)
                </Button>
              </div>
            </div>
          )}

          {/* New Address Initiation Form */}
          {!activeCooldown && (
            <div className="space-y-3 pt-2 border-t">
              <Label className="text-xs font-semibold">Initiate Recovery Address Change</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="Enter new Stellar public key (G...)"
                  value={newTargetAddress}
                  onChange={(e) => setNewTargetAddress(e.target.value)}
                  className="text-xs h-8"
                  data-testid="input-new-recovery-address"
                />
                <Button
                  size="sm"
                  onClick={handleStartCooldown}
                  disabled={!newTargetAddress.trim()}
                  className="whitespace-nowrap"
                  data-testid="btn-start-cooldown"
                >
                  Start 48h Cooldown
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
