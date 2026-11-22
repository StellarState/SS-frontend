"use client";

import React, { useState } from "react";
import { useWithdrawalAllowlist } from "@/hooks/useWithdrawalAllowlist";

interface WithdrawalAllowlistSettingsProps {
  className?: string;
}

export function WithdrawalAllowlistSettings({
  className = "",
}: WithdrawalAllowlistSettingsProps) {
  const {
    settings,
    liveEntries,
    isReauthenticated,
    reauthenticate,
    setEnforcement,
    addAddress,
    cancelPending,
    removeAddress,
  } = useWithdrawalAllowlist();

  const [addressInput, setAddressInput] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [expiryDaysInput, setExpiryDaysInput] = useState<number | "">("");
  const [passcodeInput, setPasscodeInput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleToggleEnforcement = (targetState: boolean) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = setEnforcement(targetState, passcodeInput);
    if (!res.success) {
      setErrorMessage(res.error || "Authentication required.");
    } else {
      setSuccessMessage(
        `Allowlist enforcement ${targetState ? "enabled" : "disabled"}.`,
      );
    }
  };

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = addAddress(
      {
        address: addressInput,
        label: labelInput,
        expiresInDays: expiryDaysInput ? Number(expiryDaysInput) : null,
      },
      passcodeInput,
    );

    if (!res.success) {
      setErrorMessage(res.error || "Failed to add address.");
    } else {
      setSuccessMessage(
        "Address registered! Mandatory security cooldown has begun.",
      );
      setAddressInput("");
      setLabelInput("");
      setExpiryDaysInput("");
    }
  };

  const handleReauth = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!reauthenticate(passcodeInput)) {
      setErrorMessage("Invalid passcode. Enter at least 4 characters.");
    } else {
      setSuccessMessage("Authentication verified for this session.");
      setPasscodeInput("");
    }
  };

  return (
    <div
      data-testid="withdrawal-allowlist-settings"
      className={`rounded-xl border border-border bg-card p-6 shadow-sm text-card-foreground ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4 mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            Withdrawal Address Allowlist
          </h2>
          <p className="text-sm text-muted-foreground">
            Restrict asset withdrawals exclusively to pre-approved addresses.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold">
            <span>Enforce Allowlist:</span>
            <input
              type="checkbox"
              data-testid="enforce-toggle"
              checked={settings.enforced}
              onChange={(e) => handleToggleEnforcement(e.target.checked)}
              className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
            />
          </label>
        </div>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div
          data-testid="allowlist-error"
          className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive"
        >
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div
          data-testid="allowlist-success"
          className="mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-600 dark:text-emerald-400"
        >
          {successMessage}
        </div>
      )}

      {/* Re-auth Status Banner */}
      {!isReauthenticated && (
        <form
          onSubmit={handleReauth}
          className="mb-6 rounded-lg bg-amber-500/10 border border-amber-500/20 p-4 text-xs"
        >
          <div className="font-semibold text-amber-800 dark:text-amber-300 mb-2">
            🔒 Fresh Authentication Required
          </div>
          <p className="text-muted-foreground mb-3">
            Modifying allowlist rules or adding addresses requires authentication confirmation.
          </p>
          <div className="flex items-center gap-2 max-w-sm">
            <input
              type="password"
              placeholder="Enter PIN / Passcode"
              aria-label="Passcode for verification"
              value={passcodeInput}
              onChange={(e) => setPasscodeInput(e.target.value)}
              className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs"
            />
            <button
              type="submit"
              className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:bg-primary/90"
            >
              Verify Session
            </button>
          </div>
        </form>
      )}

      {/* Add New Address Form */}
      <form onSubmit={handleAddEntry} className="mb-8 rounded-lg border border-border p-4 bg-muted/20">
        <h3 className="text-sm font-semibold mb-3">Add Allowlisted Address</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs mb-3">
          <div>
            <label htmlFor="address-input" className="block text-muted-foreground mb-1 font-medium">
              Stellar Address (starts with G)
            </label>
            <input
              id="address-input"
              type="text"
              placeholder="e.g. GAB..."
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 font-mono text-xs"
            />
          </div>
          <div>
            <label htmlFor="label-input" className="block text-muted-foreground mb-1 font-medium">
              Label / Description
            </label>
            <input
              id="label-input"
              type="text"
              placeholder="e.g. Hardware Vault"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs"
            />
          </div>
          <div>
            <label htmlFor="expiry-input" className="block text-muted-foreground mb-1 font-medium">
              Expires In (Days - Optional)
            </label>
            <input
              id="expiry-input"
              type="number"
              min="1"
              max="365"
              placeholder="e.g. 30"
              value={expiryDaysInput}
              onChange={(e) =>
                setExpiryDaysInput(e.target.value ? Number(e.target.value) : "")
              }
              className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs"
            />
          </div>
        </div>
        <div className="flex justify-between items-center text-[11px] text-muted-foreground">
          <span>Mandatory security cooldown: {settings.cooldownHours} hours before activation.</span>
          <button
            type="submit"
            data-testid="submit-allowlist-btn"
            className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:bg-primary/90"
          >
            Add Address
          </button>
        </div>
      </form>

      {/* Allowlist Table */}
      <div>
        <h3 className="text-sm font-semibold mb-3">
          Registered Addresses ({liveEntries.length})
        </h3>
        {liveEntries.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-lg">
            No allowlisted addresses registered.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-border rounded-lg">
              <thead className="bg-muted text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-2 px-3">Label</th>
                  <th className="py-2 px-3">Address</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Expiry</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {liveEntries.map((entry) => (
                  <tr key={entry.id} data-testid={`entry-row-${entry.id}`}>
                    <td className="py-2 px-3 font-medium">{entry.label}</td>
                    <td className="py-2 px-3 font-mono text-muted-foreground text-[11px]">
                      {entry.address.slice(0, 8)}...{entry.address.slice(-6)}
                    </td>
                    <td className="py-2 px-3">
                      {entry.evaluatedStatus === "active" && (
                        <span className="inline-flex rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 border border-emerald-500/20">
                          Active
                        </span>
                      )}
                      {entry.evaluatedStatus === "pending_cooldown" && (
                        <span className="inline-flex rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 border border-amber-500/20">
                          Cooldown Pending
                        </span>
                      )}
                      {entry.evaluatedStatus === "expired" && (
                        <span className="inline-flex rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive border border-destructive/20">
                          Expired
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground text-[11px]">
                      {entry.expiresAt
                        ? new Date(entry.expiresAt).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {entry.evaluatedStatus === "pending_cooldown" ? (
                        <button
                          type="button"
                          onClick={() => cancelPending(entry.id)}
                          data-testid={`cancel-pending-${entry.id}`}
                          className="text-amber-600 hover:underline"
                        >
                          Cancel
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => removeAddress(entry.id, passcodeInput)}
                          data-testid={`remove-entry-${entry.id}`}
                          className="text-destructive hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
