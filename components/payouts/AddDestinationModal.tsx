"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  validateDestination,
  type DestinationInput,
} from "@/lib/destinations";

interface AddDestinationModalProps {
  onAdd: (input: DestinationInput) => void;
  editing?: { id: string } & DestinationInput;
  onEdit?: (id: string, patch: DestinationInput) => void;
}

/** #649: validates Stellar addresses and optional memo requirement inline. */
export function AddDestinationModal({ onAdd, editing, onEdit }: AddDestinationModalProps) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(editing?.label ?? "");
  const [address, setAddress] = useState(editing?.address ?? "");
  const [requiresMemo, setRequiresMemo] = useState(editing?.requiresMemo ?? false);
  const [memo, setMemo] = useState(editing?.memo ?? "");
  const [errors, setErrors] = useState<ReturnType<typeof validateDestination>["errors"]>({});

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = validateDestination({ label, address, requiresMemo, memo });
    if (!result.valid || !result.destination) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    if (editing && onEdit) onEdit(editing.id, result.destination);
    else onAdd(result.destination);
    setOpen(false);
    setLabel("");
    setAddress("");
    setRequiresMemo(false);
    setMemo("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" data-testid="add-destination-trigger">
          {editing ? "Edit destination" : "Add destination"}
        </Button>
      </DialogTrigger>
      <DialogContent data-testid="add-destination-modal">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit destination" : "Add a payout destination"}</DialogTitle>
          <DialogDescription>
            Saved destinations make withdrawals safer. New ones need confirmation before first use.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3" data-testid="destination-form">
          <div className="space-y-1">
            <Label htmlFor="destination-label">Label</Label>
            <Input
              id="destination-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              aria-invalid={Boolean(errors.label)}
              data-testid="destination-label"
            />
            {errors.label && <p className="text-xs text-red-700">{errors.label}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="destination-address">Stellar address</Label>
            <Input
              id="destination-address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              aria-invalid={Boolean(errors.address)}
              data-testid="destination-address"
              className="font-mono text-xs"
            />
            {errors.address && (
              <p role="alert" className="text-xs text-red-700" data-testid="address-error">
                {errors.address}
              </p>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={requiresMemo}
              onChange={(event) => setRequiresMemo(event.target.checked)}
              data-testid="requires-memo"
            />
            This destination requires a memo
          </label>

          {requiresMemo && (
            <div className="space-y-1">
              <Label htmlFor="destination-memo">Memo</Label>
              <Input
                id="destination-memo"
                value={memo}
                onChange={(event) => setMemo(event.target.value)}
                aria-invalid={Boolean(errors.memo)}
                data-testid="destination-memo"
              />
              {errors.memo && (
                <p role="alert" className="text-xs text-red-700" data-testid="memo-error">
                  {errors.memo}
                </p>
              )}
            </div>
          )}

          <Button type="submit" data-testid="save-destination">Save destination</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
