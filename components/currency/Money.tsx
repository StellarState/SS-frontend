"use client";

/**
 * Multi-currency display (#437)
 *
 * Renders an XLM-denominated amount in the user's display currency.
 *
 *  - XLM (or USD with no rate yet): renders exactly the text the call site
 *    used before (`xlmText`, default `formatXLM`) with no extra markup, so XLM
 *    screens look and test the same as before this feature.
 *  - USD: renders the converted value followed by an asterisk. The asterisk
 *    and the value's tooltip carry the exchange-rate disclaimer (rate,
 *    source, fetch time, "settles in XLM"), so every converted value has its
 *    disclaimer right next to it. Pages also show the full sentence once via
 *    <ExchangeRateDisclaimer />.
 */

import { useCurrency } from "@/hooks/useCurrency";
import { describeExchangeRate, formatFiat, isFiatCurrency } from "@/lib/currency";
import { formatXLM } from "@/lib/format";
import { cn } from "@/lib/utils";

interface MoneyProps {
  /** Amount in XLM (the unit every API value uses). */
  xlm?: number | string | null | undefined;
  /** Alias for xlm amount */
  amount?: number | string | null | undefined;
  /** Optional decimal precision */
  decimals?: number;
  /** Exact text to show when displaying XLM; defaults to `formatXLM`. */
  xlmText?: string;
  /** Whether to show the original XLM amount alongside converted value. */
  showOriginal?: boolean;
  className?: string;
}

export function Money({ xlm, amount: amountProp, decimals, xlmText, className, showOriginal = true }: MoneyProps) {
  const { currency, isConverted, convert, exchangeRate, isStale } = useCurrency();
  const amount = Number(xlm ?? amountProp ?? 0);
  const originalText = xlmText ?? formatXLM(amount);

  if (!isConverted || !exchangeRate || !isFiatCurrency(currency) || !Number.isFinite(amount)) {
    return className ? <span className={className}>{originalText}</span> : <>{originalText}</>;
  }

  const disclaimer = describeExchangeRate(exchangeRate, Date.now(), currency);

  return (
    <span
      className={cn("whitespace-nowrap inline-flex items-baseline gap-1", className)}
      title={disclaimer}
      data-testid="money-converted"
      data-xlm={amount}
      data-currency={currency}
      data-stale={isStale || undefined}
    >
      <span>
        {formatFiat(convert(amount), currency)}
        <sup aria-hidden="true" className="ml-0.5 text-[0.6em] font-normal text-muted-foreground">
          *
        </sup>
        <span className="sr-only"> (estimated from XLM)</span>
        <span aria-hidden="true" className="text-[0.75em] text-muted-foreground ml-0.5" data-testid="money-estimate-label">
          (est.)
        </span>
      </span>
      {isStale && (
        <span className="text-[0.65em] font-medium text-amber-500 uppercase tracking-wider" data-testid="money-stale-tag">
          [stale]
        </span>
      )}
      {showOriginal && (
        <span className="text-xs text-muted-foreground font-normal" data-testid="money-original">
          (orig. {originalText})
        </span>
      )}
    </span>
  );
}
