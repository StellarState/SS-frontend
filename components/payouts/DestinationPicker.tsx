"use client";

import { AlertCircle, Plus } from "lucide-react";
import { needsMemoWarning, type Destination } from "@/lib/destinations";
import { truncateAddress } from "@/lib/stellar";

interface DestinationPickerProps {
  destinations: Destination[];
  selectedId?: string | null;
  onSelect: (destination: Destination) => void;
  onUseNew: () => void;
  onConfirm: (id: string) => void;
}

/**
 * Withdrawal-flow picker (#649). Only confirmed destinations are usable;
 * new ones are listed but require a confirmation step first.
 */
export function DestinationPicker({
  destinations,
  selectedId,
  onSelect,
  onUseNew,
  onConfirm,
}: DestinationPickerProps) {
  return (
    <fieldset className="space-y-2" data-testid="destination-picker">
      <legend className="text-sm font-medium">Withdraw to</legend>

      {destinations.length === 0 && (
        <p className="text-sm text-muted-foreground" data-testid="no-destinations">
          No saved destinations yet.
        </p>
      )}

      {destinations.map((destination) => {
        const usable = destination.confirmed;
        return (
          <div
            key={destination.id}
            data-testid={`picker-destination-${destination.id}`}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm"
          >
            <button
              type="button"
              disabled={!usable}
              aria-pressed={selectedId === destination.id}
              onClick={() => onSelect(destination)}
              data-testid={`picker-select-${destination.id}`}
              className="text-left disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="font-medium">{destination.label}</span>{" "}
              <span className="font-mono text-xs text-muted-foreground">
                {truncateAddress(destination.address)}
              </span>
            </button>

            {needsMemoWarning(destination) && (
              <span
                role="note"
                data-testid={`memo-warning-${destination.id}`}
                className="flex items-center gap-1 text-xs text-amber-800"
              >
                <AlertCircle className="size-3.5" /> Memo required, none provided
              </span>
            )}

            {!usable && (
              <button
                type="button"
                onClick={() => onConfirm(destination.id)}
                data-testid={`confirm-destination-${destination.id}`}
                className="text-xs font-medium text-primary underline"
              >
                Confirm to enable
              </button>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={onUseNew}
        data-testid="use-new-address"
        className="inline-flex items-center gap-1 text-sm text-primary underline"
      >
        <Plus className="size-3.5" /> Use new address
      </button>
    </fieldset>
  );
}
