"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusChip } from "@/components/ui/StatusChip";
import { useDestinations } from "@/hooks/useDestinations";
import { needsMemoWarning, type Destination } from "@/lib/destinations";
import { truncateAddress } from "@/lib/stellar";
import { AddDestinationModal } from "./AddDestinationModal";
import { DestinationPicker } from "./DestinationPicker";

/** #649: saved destinations list, confirmation gate and withdrawal picker. */
export function PayoutDestinationsPanel() {
  const {
    destinations,
    addDestination,
    editDestination,
    removeDestination,
    confirmDestination,
  } = useDestinations();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function handleConfirm(event: React.FormEvent, id: string) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) {
      setCodeError("Enter the 6-digit code from your email or authenticator app.");
      return;
    }
    setCodeError(null);
    confirmDestination(id);
    setConfirmingId(null);
    setCode("");
  }

  return (
    <section className="space-y-5 rounded-lg border p-4" data-testid="payout-destinations">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Payout destinations</h2>
          <p className="text-sm text-muted-foreground">
            Saved addresses are kept on this device. New ones need confirmation before first use.
          </p>
        </div>
        <AddDestinationModal onAdd={addDestination} />
      </div>

      {destinations.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="no-saved-destinations">
          No saved destinations yet. Add one to speed up withdrawals.
        </p>
      ) : (
        <ul className="space-y-2" data-testid="destination-list">
          {destinations.map((destination) => (
            <li
              key={destination.id}
              data-testid={`destination-${destination.id}`}
              className="space-y-2 rounded-md border p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm">
                  <p className="font-medium">{destination.label}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {truncateAddress(destination.address)}
                  </p>
                  {needsMemoWarning(destination) && (
                    <p role="note" className="text-xs text-amber-800">
                      Memo required, none provided
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <StatusChip
                    variant={destination.confirmed ? "success" : "warning"}
                    label={destination.confirmed ? "Confirmed" : "Needs confirmation"}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDestination(destination.id)}
                    data-testid={`delete-${destination.id}`}
                    aria-label={`Delete ${destination.label}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>

              {!destination.confirmed && confirmingId !== destination.id && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmingId(destination.id)}
                  data-testid={`start-confirm-${destination.id}`}
                >
                  Confirm via email / 2FA
                </Button>
              )}

              {confirmingId === destination.id && (
                <form
                  onSubmit={(event) => handleConfirm(event, destination.id)}
                  className="flex flex-wrap items-center gap-2"
                  data-testid={`confirm-form-${destination.id}`}
                >
                  <Input
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="6-digit code"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    aria-label="Confirmation code"
                    data-testid="confirmation-code"
                  />
                  <Button type="submit" size="sm" data-testid="submit-confirmation">
                    Confirm destination
                  </Button>
                  {codeError && <p className="text-xs text-red-700">{codeError}</p>}
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      <DestinationPicker
        destinations={destinations}
        selectedId={selectedId}
        onSelect={(destination: Destination) => setSelectedId(destination.id)}
        onUseNew={() => setSelectedId(null)}
        onConfirm={setConfirmingId}
      />
    </section>
  );
}
