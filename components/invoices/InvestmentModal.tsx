"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InvestmentAmountInput } from "@/components/invoices/InvestmentAmountInput";
import { FeeTierDisplay } from "@/components/invoices/FeeTierDisplay";
import { AccreditationGateSteps } from "@/components/invoices/AccreditationGateModal";
import { useInvestMutation } from "@/hooks/useInvestments";
import { useAccreditation } from "@/context/AccreditationContext";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface InvestmentModalProps {
  invoiceId: string;
  minInvestment: number;
  maxInvestment: number;
  onSuccess?: () => void;
}

export function InvestmentModal({
  invoiceId,
  minInvestment,
  maxInvestment,
  onSuccess,
}: InvestmentModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [validAmount, setValidAmount] = useState<number | null>(null);
  const investMutation = useInvestMutation();
  // Accreditation acknowledgement gate (issue #312): first-time investors
  // must complete the disclosure steps before the investment form appears.
  const { isAcknowledged } = useAccreditation();

  const handleInvest = async () => {
    if (validAmount === null) return;

    await investMutation.mutateAsync({ invoiceId, amount: validAmount });
    setIsOpen(false);
    setValidAmount(null);
    onSuccess?.();
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button data-testid="invest-button">Invest</Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        {!isAcknowledged ? (
          <AccreditationGateSteps
            onCancel={() => setIsOpen(false)}
            onAcknowledged={() => {
              /* Falls through to the investment form below on next render. */
            }}
          />
        ) : (
          <div className="space-y-4 p-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Invest in this Invoice</h3>
              <p className="text-sm text-muted-foreground">
                Enter the amount you'd like to invest
              </p>
            </div>

            <InvestmentAmountInput
              min={minInvestment}
              max={maxInvestment}
              onValidAmountChange={setValidAmount}
            />

            <FeeTierDisplay amount={validAmount} />

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleInvest}
                disabled={validAmount === null || investMutation.isPending}
                className="flex-1"
              >
                {investMutation.isPending ? "Investing..." : "Invest"}
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
