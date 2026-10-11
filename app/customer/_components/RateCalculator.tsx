"use client";

import { useId, type ReactNode } from "react";
import {
  DEMO_EXCHANGE_RATE_ETB_PER_CAD,
  TRANSFER_LIMITS_CAD,
} from "../_lib/config";
import { formatCad, formatEtb, formatRate } from "../_lib/format";
import {
  calculateQuote,
  parseAmountInput,
  validateSendAmount,
} from "../_lib/quote";
import type { DeliverySpeed, Quote } from "../_lib/types";
import { QuoteSummary } from "./QuoteSummary";

export interface RateCalculatorProps {
  amountText: string;
  onAmountTextChange(value: string): void;

  deliverySpeed: DeliverySpeed;
  onDeliverySpeedChange(speed: DeliverySpeed): void;

  /**
   * Business-controlled exchange rate.
   * Falls back to the demo rate when not supplied.
   */
  exchangeRate?: number;

  /**
   * Business-controlled transfer fee.
   * Falls back to $0 when not supplied.
   */
  transferFeeCad?: number;

  /**
   * Customer choice:
   * false = fee added on top
   * true = fee included in entered amount
   */
  feeIncludedInAmount?: boolean;

  onFeeIncludedInAmountChange?(included: boolean): void;

  /** Show validation messages after the user tries to continue. */
  showErrors?: boolean;

  footer?: ReactNode;
  heading?: ReactNode;
}

/**
 * Derives the quote and validation state for a raw amount string.
 */
export function quoteFromInput(
  amountText: string,
  deliverySpeed: DeliverySpeed,
  exchangeRate: number = DEMO_EXCHANGE_RATE_ETB_PER_CAD,
  transferFeeCad: number = 0,
  feeIncludedInAmount: boolean = false,
) {
  const amount = parseAmountInput(amountText);

  const quote: Quote = calculateQuote(
    Number.isFinite(amount) ? amount : 0,
    deliverySpeed,
    exchangeRate,
    transferFeeCad,
    feeIncludedInAmount,
  );

  const error = validateSendAmount(
    amount,
    transferFeeCad,
    feeIncludedInAmount,
  );

  return {
    amount,
    quote,
    error,
  };
}

/**
 * CAD to ETB calculator.
 *
 * The parent owns the state so this component can be used by both
 * the public landing page and the authenticated Send Money page.
 */
export function RateCalculator({
  amountText,
  onAmountTextChange,
  deliverySpeed,
  onDeliverySpeedChange,
  exchangeRate = DEMO_EXCHANGE_RATE_ETB_PER_CAD,
  transferFeeCad = 0,
  feeIncludedInAmount = false,
  onFeeIncludedInAmountChange,
  showErrors = false,
  footer,
  heading,
}: RateCalculatorProps) {
  const inputId = useId();

  const { quote, error } = quoteFromInput(
    amountText,
    deliverySpeed,
    exchangeRate,
    transferFeeCad,
    feeIncludedInAmount,
  );

  const visibleError =
    showErrors ||
    (amountText !== "" && error && !error.startsWith("Enter"))
      ? error
      : null;

  return (
    <div className="min-w-0 space-y-5">
      {heading}

      <div>
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-slate-800"
        >
          You send
        </label>

        <div
          className={`flex min-h-14 items-center overflow-hidden rounded-xl border bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-500/40 ${
            visibleError
              ? "border-red-400"
              : "border-slate-300 focus-within:border-blue-500"
          }`}
        >
          <span
            aria-hidden="true"
            className="pl-4 text-lg text-slate-500"
          >
            $
          </span>

          <input
            id={inputId}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={amountText}
            onChange={(e) =>
              onAmountTextChange(
                e.target.value.replace(/[^0-9.,]/g, ""),
              )
            }
            aria-invalid={visibleError ? true : undefined}
            aria-describedby={`${inputId}-help`}
            placeholder="0.00"
            className="min-w-0 flex-1 bg-transparent px-2 py-3 text-2xl font-semibold tabular-nums text-slate-900 focus:outline-none"
          />

          <span className="mr-2 shrink-0 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-800">
            CAD
          </span>
        </div>

        <p
          id={`${inputId}-help`}
          className={`mt-1.5 text-sm ${
            visibleError ? "text-red-700" : "text-slate-500"
          }`}
        >
          {visibleError ??
            `Send between ${formatCad(
              TRANSFER_LIMITS_CAD.min,
            )} and ${formatCad(
              TRANSFER_LIMITS_CAD.max,
            )} CAD.`}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <span className="font-medium">Exchange rate</span>

        <span className="font-semibold tabular-nums">
          {formatRate(quote.exchangeRate)}
        </span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium text-slate-800">
            Transfer fee
          </span>

          <span className="font-semibold tabular-nums text-slate-900">
            {formatCad(quote.feeCad)}
          </span>
        </div>

        {onFeeIncludedInAmountChange && (
          <label className="mt-4 flex cursor-pointer items-start gap-3 border-t border-slate-200 pt-4">
            <input
              type="checkbox"
              checked={feeIncludedInAmount}
              onChange={(e) =>
                onFeeIncludedInAmountChange(e.target.checked)
              }
              className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 accent-blue-600"
            />

            <span className="min-w-0">
              <span className="block text-sm font-medium text-slate-800">
                Include transfer fee in the amount
              </span>

              <span className="mt-0.5 block text-xs text-slate-500">
                {feeIncludedInAmount
                  ? `The ${formatCad(
                      quote.feeCad,
                    )} fee will be deducted from the amount you entered.`
                  : `The ${formatCad(
                      quote.feeCad,
                    )} fee will be added on top of the amount you entered.`}
              </span>
            </span>
          </label>
        )}
      </div>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <p className="text-sm font-medium text-emerald-900">
          Recipient gets
        </p>

        <p
          className="mt-0.5 break-words text-2xl font-bold tabular-nums text-emerald-950"
          aria-live="polite"
        >
          {formatEtb(quote.receiveAmountEtb)}
        </p>
      </div>

      <QuoteSummary quote={quote} />

      {footer}
    </div>
  );
}