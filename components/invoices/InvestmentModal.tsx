"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GuardedButton } from "@/components/network/GuardedButton";
import { InvestmentAmountInput } from "@/components/invoices/InvestmentAmountInput";
import { InvestCurrencySelector } from "@/components/invoices/InvestCurrencySelector";
import { FeeTierDisplay } from "@/components/invoices/FeeTierDisplay";
import { PriceImpactWarning } from "@/components/invoices/PriceImpactWarning";
import { ExposureWarningBanner } from "@/components/invoices/ExposureWarningBanner";
import { usePositionExposure } from "@/hooks/usePositionExposure";
import { FeeBreakdown } from "@/components/fees/FeeBreakdown";
import { TopUpCta } from "@/components/wallet/TopUpCta";
import { OnboardingBonusChip } from "@/components/invoices/OnboardingBonusChip";
import { AccreditationGateSteps } from "@/components/invoices/AccreditationGateModal";
import { useInvestMutation } from "@/hooks/useInvestments";
import { useInvestorLoyalty } from "@/hooks/useInvestorLoyalty";
import { useFxRate } from "@/hooks/useFxRate";
import { useUsdcBalance } from "@/hooks/useUsdcBalance";
import { useWallet } from "@/context/WalletContext";
import { useAccreditation } from "@/context/AccreditationContext";
import { formatUsdc, formatXLM } from "@/lib/format";
import {
  BASE_CURRENCY,
  investErrorMessage,
  isRateStale as isFxRateStale,
  type InvestCurrency,
} from "@/lib/investCurrency";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface InvestmentModalProps {
  invoiceId: string;
  minInvestment: number;
  maxInvestment: number;
  /** Total funding cap used for price-impact calculation (issue #344). */
  fundingCap?: number;
  onSuccess?: () => void;
  trancheType?: 1 | 2;
  issuerAddress?: string;
  debtorName?: string | null;
  jurisdiction?: string | null;
}

export function InvestmentModal({
  invoiceId,
  minInvestment,
  maxInvestment,
  fundingCap,
  onSuccess,
  trancheType,
  issuerAddress,
  debtorName,
  jurisdiction,
}: InvestmentModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [validAmount, setValidAmount] = useState<number | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<InvestCurrency>(BASE_CURRENCY);
  // #654: confirmation stays disabled while the balance cannot cover the
  // network fee, platform fee and base reserve.
  const [feeBlocked, setFeeBlocked] = useState(false);
  const investMutation = useInvestMutation();
  const fxRate = useFxRate(currency);
  const { address, network } = useWallet();
  const { balance, refresh } = useUsdcBalance(address, network);
  const loyalty = useInvestorLoyalty(address);

  // A null balance means the balance is still unknown, which is not the same as
  // being underfunded, so it must not block the investment.
  const isBaseCurrency = currency === BASE_CURRENCY;
  const insufficientBalance =
    isBaseCurrency && balance !== null && validAmount !== null && validAmount > balance;

  const rateStale = fxRate.data ? isFxRateStale(fxRate.data.updated_at) : false;
  // A non-base payment cannot be priced without a fresh oracle rate.
  const fxBlocked = !isBaseCurrency && (!fxRate.data || rateStale);

  // Accreditation acknowledgement gate (issue #312): first-time investors
  // must complete the disclosure steps before the investment form appears.
  const { isAcknowledged } = useAccreditation();

  const { evaluation, isHardBlocked, shouldShowSoftWarning, dismissSoftWarning } = usePositionExposure({
    invoice: {
      id: invoiceId,
      issuer: issuerAddress ?? "Unspecified",
      debtor: debtorName ?? null,
      jurisdiction: jurisdiction ?? null,
    },
    proposedAmount: validAmount ?? 0,
  });

  const currencyErrorMessage = investErrorMessage(investMutation.error, currency);

  const handleInvest = async () => {
    if (
      validAmount === null ||
      amountError !== null ||
      insufficientBalance ||
      fxBlocked ||
      feeBlocked ||
      isHardBlocked
    ) {
      return;
    }

    await investMutation.mutateAsync({
      invoiceId,
      amount: validAmount,
      ...(trancheType ? { trancheType } : {}),
      ...(isBaseCurrency ? {} : { currency }),
    });
    setIsOpen(false);
    setValidAmount(null);
    setAmountError(null);
    setFeeBlocked(false);
    // The chain has moved; re-read the balance instead of waiting for the
    // 60s poll.
    refresh();
    onSuccess?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button data-testid="invest-button" data-tour="invest-button">
          Invest
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto p-0 sm:max-w-md">
        <DialogTitle className="sr-only">Investment dialog</DialogTitle>
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
                Enter the amount you&apos;d like to invest
              </p>
              <OnboardingBonusChip />
            </div>

            <div className="flex items-center justify-between text-sm" data-testid="investment-modal-min-investment">
              <span className="text-muted-foreground">Minimum investment</span>
              <span
                className="font-medium tabular-nums"
                data-testid="investment-modal-min-value"
              >
                {formatXLM(minInvestment)}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Wallet USDC balance
              </span>
              <span
                className="font-medium tabular-nums"
                data-testid="investment-modal-balance"
              >
                {balance === null ? "Loading…" : formatUsdc(balance)}
              </span>
            </div>

            <InvestmentAmountInput
              min={minInvestment}
              max={maxInvestment}
              onValidAmountChange={setValidAmount}
              onErrorChange={setAmountError}
            />

            <InvestCurrencySelector
              currency={currency}
              onCurrencyChange={setCurrency}
              amount={validAmount}
              rate={fxRate.data}
              isRateLoading={!isBaseCurrency && fxRate.isLoading}
              isRateError={!isBaseCurrency && fxRate.isError}
              isRateStale={rateStale}
            />

            {investMutation.error && currencyErrorMessage && (
              <p className="text-sm text-destructive" role="alert" data-testid="invest-currency-error">
                {currencyErrorMessage}
              </p>
            )}

            {insufficientBalance && address && (
              <TopUpCta
                address={address}
                balance={balance}
                requiredAmount={validAmount as number}
              />
            )}

            <FeeTierDisplay amount={validAmount} loyalty={loyalty.data} />

            {/* #450 — link to the full public fee schedule so the tier shown
                above can be read in context (what it applies to, and the other
                fees that will hit this investment later). */}
            <p className="text-xs text-muted-foreground">
              See the{" "}
              <Link
                href="/fees"
                className="underline underline-offset-2 hover:text-foreground"
                data-testid="investment-modal-fees-link"
              >
                full fee schedule
              </Link>{" "}
              for every fee that applies.
            </p>

            <PriceImpactWarning
              amount={validAmount}
              fundingCap={fundingCap ?? maxInvestment}
            />

            {validAmount !== null && (
              <FeeBreakdown
                amount={validAmount}
                onInsufficientBalance={setFeeBlocked}
              />
            )}

            {validAmount !== null && validAmount > 0 && (
              <ExposureWarningBanner
                evaluation={evaluation}
                isDismissed={!shouldShowSoftWarning}
                onDismiss={dismissSoftWarning}
              />
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setFeeBlocked(false);
                  setIsOpen(false);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <GuardedButton
                onClick={handleInvest}
                disabled={
                  validAmount === null ||
                  amountError !== null ||
                  investMutation.isPending ||
                  insufficientBalance ||
                  fxBlocked ||
                  feeBlocked ||
                  isHardBlocked
                }
                data-testid="investment-submit"
                className="flex-1"
              >
                {investMutation.isPending ? "Investing..." : "Invest"}
              </GuardedButton>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
