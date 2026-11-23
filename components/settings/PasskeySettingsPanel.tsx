"use client";

import React, { useState } from "react";
import {
  usePasskeyManager,
  UsePasskeyManagerOptions,
} from "@/hooks/usePasskeyManager";
import {
  sanitizePasskeyForDisplay,
  requireWalletTransactionProof,
} from "@/lib/security/passkeys";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  KeyRound,
  Fingerprint,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Plus,
  AlertTriangle,
  Info,
  CheckCircle2,
  HardDrive,
  Laptop,
  Lock,
} from "lucide-react";

export interface PasskeySettingsPanelProps {
  initialOptions?: UsePasskeyManagerOptions;
}

export function PasskeySettingsPanel({ initialOptions }: PasskeySettingsPanelProps) {
  const {
    passkeys,
    activeChallenge,
    isEnrolling,
    actionError,
    actionSuccess,
    requestEnrollmentChallenge,
    completeEnrollment,
    cancelEnrollment,
    removePasskey,
    verifyHighRiskAction,
  } = usePasskeyManager(initialOptions);

  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyType, setNewKeyType] = useState<"platform" | "cross-platform">("platform");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [removalConfirmText, setRemovalConfirmText] = useState("");
  const [testActionStatus, setTestActionStatus] = useState<string | null>(null);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [recoveryCodeInput, setRecoveryCodeInput] = useState("");

  const handleStartEnroll = () => {
    setNewKeyName("");
    requestEnrollmentChallenge();
  };

  const handleFinishEnroll = () => {
    if (!newKeyName.trim()) return;
    completeEnrollment(newKeyName, newKeyType);
  };

  const handleConfirmRemoval = (id: string) => {
    const res = removePasskey(id, removalConfirmText);
    if (res.success) {
      setDeletingId(null);
      setRemovalConfirmText("");
    }
  };

  const handleTestPasskeyAction = () => {
    const res = verifyHighRiskAction("passkey");
    setTestActionStatus(res.success ? "Passkey Verified" : "Failed");
  };

  const handleTestFallbackAction = () => {
    const res = verifyHighRiskAction("recovery_code", recoveryCodeInput || "RC-9821-4401");
    setTestActionStatus(res.success ? "Fallback Verified" : "Failed");
  };

  return (
    <div className="space-y-6" data-testid="passkey-settings-panel">
      {/* Policy Boundary Banner: Transactions vs Passkeys */}
      <Alert className="border-blue-500/40 bg-blue-50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200" data-testid="transaction-boundary-alert">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="font-semibold text-xs">Security Policy Distinction</AlertTitle>
        <AlertDescription className="text-xs mt-1">
          Passkeys authenticate account login and protect high-risk profile changes.
          <strong> On-chain Stellar transactions always require cryptographic wallet signing</strong> via Freighter or your hardware wallet.
        </AlertDescription>
      </Alert>

      {/* Status Messages */}
      {actionError && (
        <Alert variant="destructive" data-testid="passkey-error-alert">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Action Blocked</AlertTitle>
          <AlertDescription className="text-xs">{actionError}</AlertDescription>
        </Alert>
      )}

      {actionSuccess && (
        <Alert className="border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200" data-testid="passkey-success-alert">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertTitle className="font-semibold text-xs">Operation Succeeded</AlertTitle>
          <AlertDescription className="text-xs">{actionSuccess}</AlertDescription>
        </Alert>
      )}

      {/* Enrolled Passkeys List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-primary" />
                Registered Passkeys
              </CardTitle>
              <CardDescription className="text-xs">
                FIDO2 hardware authenticators and biometric devices associated with your account.
              </CardDescription>
            </div>

            <Button
              size="sm"
              onClick={handleStartEnroll}
              disabled={isEnrolling}
              data-testid="btn-add-passkey"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Passkey
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Enrollment Modal / In-line Card */}
          {isEnrolling && activeChallenge && (
            <div className="p-4 rounded-lg border-2 border-primary/40 bg-primary/5 space-y-3" data-testid="enrollment-challenge-box">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-primary" />
                  Passkey Enrollment Challenge Active
                </span>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {activeChallenge.challengeId}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <Label className="text-[11px]">Passkey Device Label</Label>
                  <Input
                    placeholder="e.g. MacBook Pro Touch ID, YubiKey 5C"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="h-8 text-xs"
                    data-testid="input-passkey-name"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px]">Authenticator Type</Label>
                  <select
                    value={newKeyType}
                    onChange={(e) =>
                      setNewKeyType(e.target.value as "platform" | "cross-platform")
                    }
                    className="w-full h-8 px-2 text-xs rounded-md border bg-background"
                    data-testid="select-authenticator-type"
                  >
                    <option value="platform">Platform (Touch ID / Face ID / Windows Hello)</option>
                    <option value="cross-platform">Cross-Platform (Security Key / YubiKey)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={cancelEnrollment}
                  data-testid="btn-cancel-enroll"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleFinishEnroll}
                  disabled={!newKeyName.trim()}
                  data-testid="btn-complete-enroll"
                >
                  Verify &amp; Save Passkey
                </Button>
              </div>
            </div>
          )}

          {/* Passkeys Table / Cards */}
          {passkeys.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground" data-testid="no-passkeys-message">
              No passkeys currently registered. Add a passkey to enable biometric login.
            </div>
          ) : (
            passkeys.map((pk) => {
              const displayMeta = sanitizePasskeyForDisplay(pk);
              const isDeleting = deletingId === pk.id;

              return (
                <div
                  key={pk.id}
                  className="p-3.5 rounded-lg border bg-card/60 space-y-2"
                  data-testid={`passkey-item-${pk.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-md bg-muted">
                        {pk.authenticatorType === "platform" ? (
                          <Laptop className="w-4 h-4 text-primary" />
                        ) : (
                          <HardDrive className="w-4 h-4 text-emerald-600" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-sm flex items-center gap-2">
                          <span>{displayMeta.name}</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {displayMeta.deviceType}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {displayMeta.algorithm}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-3 mt-0.5">
                          <span>ID: {displayMeta.id}</span>
                          <span>Added: {new Date(displayMeta.createdAt).toLocaleDateString()}</span>
                          <span>Last used: {displayMeta.lastUsedAt}</span>
                        </div>
                      </div>
                    </div>

                    {!isDeleting && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDeletingId(pk.id);
                          setRemovalConfirmText("");
                        }}
                        className="text-destructive hover:bg-destructive/10 h-8"
                        data-testid={`btn-remove-${pk.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Remove
                      </Button>
                    )}
                  </div>

                  {/* Fresh Confirmation Input before Removal */}
                  {isDeleting && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md space-y-2 mt-2" data-testid={`removal-confirmation-box-${pk.id}`}>
                      <div className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Fresh Confirmation Required: Type &ldquo;REMOVE&rdquo; to delete this passkey
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Type REMOVE"
                          value={removalConfirmText}
                          onChange={(e) => setRemovalConfirmText(e.target.value)}
                          className="h-8 text-xs bg-background"
                          data-testid={`input-confirm-remove-${pk.id}`}
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleConfirmRemoval(pk.id)}
                          data-testid={`btn-confirm-delete-${pk.id}`}
                        >
                          Confirm Removal
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeletingId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* High-Risk Action Verification & Usable Fallback Sandbox */}
      <Card data-testid="high-risk-action-sandbox">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Sensitive Account Action Verification
          </CardTitle>
          <CardDescription className="text-xs">
            Test verifying high-risk changes (e.g. changing payout bank account) via Passkey or Fallback.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={handleTestPasskeyAction}
              data-testid="btn-verify-passkey-action"
            >
              <Fingerprint className="w-3.5 h-3.5 mr-1.5" />
              Verify with Passkey
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setFallbackMode(!fallbackMode)}
              data-testid="btn-toggle-fallback"
            >
              <KeyRound className="w-3.5 h-3.5 mr-1.5" />
              {fallbackMode ? "Hide Fallback Options" : "Use Fallback Method"}
            </Button>

            {testActionStatus && (
              <Badge variant="outline" className="text-xs" data-testid="test-action-status">
                {testActionStatus}
              </Badge>
            )}
          </div>

          {/* Usable Fallback Input */}
          {fallbackMode && (
            <div className="p-3 rounded-md border bg-muted/30 space-y-2" data-testid="fallback-container">
              <Label className="text-xs">Backup Recovery Code / Signature Fallback</Label>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Enter backup recovery code (e.g. RC-9821-4401)"
                  value={recoveryCodeInput}
                  onChange={(e) => setRecoveryCodeInput(e.target.value)}
                  className="h-8 text-xs bg-background"
                  data-testid="input-recovery-code"
                />
                <Button
                  size="sm"
                  onClick={handleTestFallbackAction}
                  data-testid="btn-submit-fallback"
                >
                  Verify Fallback
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
