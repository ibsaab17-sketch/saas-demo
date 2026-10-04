"use client";

import { useId, type ReactNode } from "react";
import { DEMO_FEE_OPTIONS, TRANSFER_LIMITS_CAD } from "../_lib/config";
import { formatCad, formatEtb, formatRate } from "../_lib/format";
import { calculateQuote, parseAmountInput, validateSendAmount } from "../_lib/quote";
import type { DeliverySpeed, Quote } from "../_lib/types";
import { QuoteSummary } from "./QuoteSummary";

export interface RateCalculatorProps {
  amountText: string;
  onAmountTextChange(value: string): void;
  deliverySpeed: DeliverySpeed;
  onDeliverySpeedChange(speed: DeliverySpeed): void;
  /** Show validation messages (e.g. after the user tries to continue). */
  showErrors?: boolean;
  footer?: ReactNode;
  heading?: ReactNode;
}

/** Derives the quote + validation state for a raw amount string. */
export function quoteFromInput(amountText: string, deliverySpeed: DeliverySpeed) {
  const amount = parseAmountInput(amountText);
  const quote: Quote = calculateQuote(Number.isFinite(amount) ? amount : 0, deliverySpeed);
  const error = validateSendAmount(amount);
  return { amount, quote, error };
}

/**
 * CAD → ETB calculator. Presentation only — the parent owns the state so
 * the same component powers the landing page and Send Money step 1.
 */
export function RateCalculator({
  amountText,
  onAmountTextChange,
  deliverySpeed,
  onDeliverySpeedChange,
  showErrors = false,
  footer,
  heading,
}: RateCalculatorProps) {
  const inputId = useId();
  const { quote, error } = quoteFromInput(amountText, deliverySpeed);
  const visibleError = showErrors || (amountText !== "" && error && !error.startsWith("Enter")) ? error : null;

  return (
    <div className="min-w-0 space-y-5">
      {heading}

      <div>
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-800">
          You send
        </label>
        <div
          className={`flex min-h-14 items-center overflow-hidden rounded-xl border bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-500/40 ${
            visibleError ? "border-red-400" : "border-slate-300 focus-within:border-blue-500"
          }`}
        >
          <span aria-hidden="true" className="pl-4 text-lg text-slate-500">$</span>
          <input
            id={inputId}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={amountText}
            onChange={(e) => onAmountTextChange(e.target.value.replace(/[^0-9.,]/g, ""))}
            aria-invalid={visibleError ? true : undefined}
            aria-describedby={`${inputId}-help`}
            placeholder="0.00"
            className="min-w-0 flex-1 bg-transparent px-2 py-3 text-2xl font-semibold tabular-nums text-slate-900 focus:outline-none"
          />
          <span className="mr-2 flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-800">
            <span aria-hidden="true" className="text-red-600">●</span> CAD
          </span>
        </div>
        <p id={`${inputId}-help`} className={`mt-1.5 text-sm ${visibleError ? "text-red-700" : "text-slate-500"}`}>
          {visibleError ??
            `Send between ${formatCad(TRANSFER_LIMITS_CAD.min)} and ${formatCad(TRANSFER_LIMITS_CAD.max)} CAD.`}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <span className="font-medium">Exchange rate</span>
        <span className="font-semibold tabular-nums">{formatRate(quote.exchangeRate)}</span>
      </div>

      <fieldset>
        <legend className="mb-1.5 block text-sm font-medium text-slate-800">Delivery speed &amp; fee</legend>
        <div className="grid gap-2 min-[420px]:grid-cols-2">
          {DEMO_FEE_OPTIONS.map((option) => {
            const selected = option.id === deliverySpeed;
            return (
              <label
                key={option.id}
                className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                  selected ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600" : "border-slate-300 bg-white hover:border-slate-400"
                }`}
              >
                <input
                  type="radio"
                  name={`${inputId}-speed`}
                  value={option.id}
                  checked={selected}
                  onChange={() => onDeliverySpeedChange(option.id)}
                  className="mt-1 h-4 w-4 shrink-0 accent-blue-600"
                />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-semibold text-slate-900">{option.label}</span>
                    <span className="text-sm tabular-nums text-slate-700">{formatCad(option.feeCad)}</span>
                  </span>
                  <span className="block text-xs text-slate-500">{option.description}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <p className="text-sm font-medium text-emerald-900">Recipient gets</p>
        <p className="mt-0.5 break-words text-2xl font-bold tabular-nums text-emerald-950" aria-live="polite">
          {formatEtb(quote.receiveAmountEtb)}
        </p>
      </div>

      <QuoteSummary quote={quote} />

      {footer}
    </div>
  );
}
