"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GuardedButton } from "@/components/network/GuardedButton";
import { InvestmentAmountInput } from "@/components/invoices/InvestmentAmountInput";
import { InvestCurrencySelector } from "@/components/invoices/InvestCurrencySelector";
import { PromoFeeBreakdown } from "@/components/promotions/PromoFeeBreakdown";
import { ExposureWarning } from "@/components/invoices/ExposureWarning";
import { PriceImpactWarning } from "@/components/invoices/PriceImpactWarning";
import { FeeBreakdown } from "@/components/fees/FeeBreakdown";
import { TopUpCta } from "@/components/wallet/TopUpCta";
import { OnboardingBonusChip } from "@/components/invoices/OnboardingBonusChip";
import { AccreditationGateSteps } from "@/components/invoices/AccreditationGateModal";
import { LeveragedExposureWarning } from "@/components/investor/LeveragedExposureWarning";
import {
  DEFAULT_EXPOSURE_LIMITS,
  evaluateLeveragedExposure,
  type LeveragedPositionItem,
} from "@/lib/analytics/exposureLimits";
import { AgreementModal } from "@/components/invoices/AgreementModal";
import { useAgreement } from "@/hooks/useAgreement";
import { AlertCircle } from "lucide-react";
import { useInvestMutation } from "@/hooks/useInvestments";
import { useInvestorLoyalty } from "@/hooks/useInvestorLoyalty";
import { useFxRate } from "@/hooks/useFxRate";
import { useUsdcBalance } from "@/hooks/useUsdcBalance";
import { useWallet } from "@/context/WalletContext";
import { useAccreditationStatus } from "@/hooks/useAccreditationStatus";
import { isAccreditationExpired } from "@/lib/accreditation";
import { useAccreditation } from "@/context/AccreditationContext";
import { ScreeningBanner } from "@/components/compliance/ScreeningBanner";
import { ScreeningActionGuard } from "@/components/compliance/ScreeningActionGuard";
import { formatUsdc, formatXLM } from "@/lib/format";
import { useExposureLimit } from "@/hooks/useExposureLimit";
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
  /** Face value determines whether an invoice requires active accreditation. */
  invoiceFaceValue?: number;
  onSuccess?: () => void;
  trancheType?: 1 | 2;
  currentPositions?: LeveragedPositionItem[];
  /** Debtor identity for the exposure gate (#602). */
  debtorId?: string | null;
  /** Enforces terms agreement acceptance (issue #760). */
  enforceAgreement?: boolean;
}

export function InvestmentModal({
  invoiceId,
  minInvestment,
  maxInvestment,
  fundingCap,
  invoiceFaceValue,
  onSuccess,
  trancheType,
  currentPositions = [],
  debtorId,
  enforceAgreement = false,
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
  const accreditation = useAccreditationStatus({ enabled: Boolean(address) });
  const [expiryBlocked, setExpiryBlocked] = useState(false);
  const { balance, refresh } = useUsdcBalance(address, network);
  const loyalty = useInvestorLoyalty(address);
  const [softWarningDismissed, setSoftWarningDismissed] = useState(false);

  const exposureEvaluation = useMemo(() => {
    if (validAmount === null || validAmount <= 0) return null;
    return evaluateLeveragedExposure(
      currentPositions,
      {
        invoice_id: invoiceId,
        title: `Invoice #${invoiceId}`,
        issuer: "Acme Issuer",
        debtor: "Nordic Debtor",
        jurisdiction: "EU",
        amount: validAmount,
      },
      DEFAULT_EXPOSURE_LIMITS,
      [
        {
          id: "alt-1",
          title: "Solar Grid receivable #204",
          issuer: "Helios Energy",
          debtor: "City of Valencia",
          jurisdiction: "Spain",
          yieldPercent: 8.5,
          riskTier: "A",
        },
        {
          id: "alt-2",
          title: "Nordic Shipping #109",
          issuer: "Baltic Line",
          debtor: "Fjord Corp",
          jurisdiction: "Norway",
          yieldPercent: 7.2,
          riskTier: "B",
        },
      ]
    );
  }, [validAmount, currentPositions, invoiceId]);

  const isExposureBlocked =
    Boolean(exposureEvaluation?.isHardBlocked) ||
    Boolean(exposureEvaluation?.requiresWarning && !softWarningDismissed);

  const exposure = useExposureLimit(debtorId, validAmount, maxInvestment);
  const { hasAcceptedCurrentVersion, isInvestingBlocked, investingBlockReason, currentVersion } = useAgreement();
  const isAgreementBlocked = enforceAgreement && isInvestingBlocked;
  const [agreementModalOpen, setAgreementModalOpen] = useState(false);

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
  const accreditationData = accreditation.data;
  const accreditationRequired =
    invoiceFaceValue !== undefined &&
    invoiceFaceValue >= (accreditationData?.high_value_threshold ?? 100_000);
  const isExpired =
    accreditationRequired &&
    isAccreditationExpired(accreditationData?.expires_at);

  const currencyErrorMessage = investErrorMessage(investMutation.error, currency);

  const handleInvest = async () => {
    if (
      validAmount === null ||
      amountError !== null ||
      insufficientBalance ||
      fxBlocked ||
      feeBlocked ||
      exposure.blocked ||
      isAgreementBlocked
    ) return;

    // Revalidate at submit time: a tab may have remained open past its
    // accreditation expiry while the form was already visible.
    if (accreditationRequired) {
      const latest = await accreditation.refetch();
      const current = latest.data;
      if (
        current &&
        isAccreditationExpired(current.expires_at)
      ) {
        setExpiryBlocked(true);
        return;
      }
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
        {isExpired || expiryBlocked ? (
          <div className="space-y-3 p-5" role="alertdialog" aria-labelledby="accreditation-expired-title" data-testid="accreditation-expired-card">
            <h3 id="accreditation-expired-title" className="text-lg font-semibold">Accreditation expired</h3>
            <p className="text-sm text-muted-foreground">
              Your accreditation expired on{" "}
              <strong>{accreditationData?.expires_at ? new Date(accreditationData.expires_at).toLocaleDateString() : "the date shown in your account"}</strong>.
              Renew your verification before investing in this invoice.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
              <Button asChild><Link href="/kyc/renew" data-testid="accreditation-renew-cta">Renew accreditation</Link></Button>
            </div>
          </div>
        ) : !isAcknowledged ? (
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
              onValidAmountChange={(amt) => {
                setValidAmount(amt);
                setSoftWarningDismissed(false);
              }}
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

            <ExposureWarning blocked={exposure.blocked} maximum={exposure.maximum} />

            <PromoFeeBreakdown amount={validAmount} loyalty={loyalty.data} />

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

            <ScreeningBanner />

            {validAmount !== null && (
              <FeeBreakdown
                amount={validAmount}
                onInsufficientBalance={setFeeBlocked}
              />
            )}

            {exposureEvaluation &&
              (exposureEvaluation.isHardBlocked || exposureEvaluation.requiresWarning) && (
                <LeveragedExposureWarning
                  evaluation={exposureEvaluation}
                  onDismissSoftWarning={() => setSoftWarningDismissed(true)}
                  isDismissed={softWarningDismissed}
                />
              )}

            {isAgreementBlocked && (
              <div
                role="alert"
                className="rounded-md bg-amber-500/15 p-3 text-xs text-amber-800 dark:text-amber-200 space-y-2 border border-amber-500/30"
                data-testid="investment-agreement-blocked-banner"
              >
                <div className="flex items-center gap-2 font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>Terms Acceptance Required</span>
                </div>
                <p className="text-muted-foreground">{investingBlockReason}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setAgreementModalOpen(true)}
                  data-testid="open-agreement-modal-btn"
                  className="w-full text-xs h-8"
                >
                  Review & Accept Agreement (v{currentVersion})
                </Button>
              </div>
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
              <ScreeningActionGuard actionLabel="Investing">
                <GuardedButton
                  onClick={handleInvest}
                  disabled={
                    validAmount === null ||
                    amountError !== null ||
                    investMutation.isPending ||
                    insufficientBalance ||
                    fxBlocked ||
                    feeBlocked ||
                    isExposureBlocked ||
                    exposure.blocked ||
                    isAgreementBlocked
                  }
                  data-testid="investment-submit"
                  className="flex-1"
                >
                  {investMutation.isPending ? "Investing..." : "Invest"}
                </GuardedButton>
              </ScreeningActionGuard>
            </div>
          </div>
        )}
      </DialogContent>
      <AgreementModal
        open={agreementModalOpen}
        onOpenChange={setAgreementModalOpen}
        onAccepted={() => setAgreementModalOpen(false)}
      />
    </Dialog>
  );
}
