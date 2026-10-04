import {
  DEMO_EXCHANGE_RATE_ETB_PER_CAD,
  DEMO_FEE_OPTIONS,
  TRANSFER_LIMITS_CAD,
} from "./config";
import type { DeliverySpeed, FeeOption, Quote } from "./types";

/** Round to 2 decimal places using integer cents to avoid float drift. */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function getFeeOption(speed: DeliverySpeed): FeeOption {
  return DEMO_FEE_OPTIONS.find((option) => option.id === speed) ?? DEMO_FEE_OPTIONS[0];
}

/**
 * Pure quote calculation used for instant on-screen feedback.
 *
 * PRODUCTION NOTE: the client-side quote is for display only. The server
 * must recompute the rate, fee and totals when a transfer is submitted and
 * reject any mismatch.
 */
export function calculateQuote(
  sendAmountCad: number,
  deliverySpeed: DeliverySpeed,
  exchangeRate: number = DEMO_EXCHANGE_RATE_ETB_PER_CAD,
): Quote {
  const amount = Number.isFinite(sendAmountCad) && sendAmountCad > 0 ? roundMoney(sendAmountCad) : 0;
  const feeCad = amount > 0 ? getFeeOption(deliverySpeed).feeCad : 0;
  return {
    sendAmountCad: amount,
    exchangeRate,
    feeCad,
    totalCad: roundMoney(amount + feeCad),
    receiveAmountEtb: roundMoney(amount * exchangeRate),
    deliverySpeed,
    quotedAt: new Date().toISOString(),
    isDemoRate: true,
  };
}

/** Returns an error message, or null when the amount is acceptable. */
export function validateSendAmount(sendAmountCad: number): string | null {
  if (!Number.isFinite(sendAmountCad) || sendAmountCad <= 0) {
    return "Enter an amount to send.";
  }
  if (sendAmountCad < TRANSFER_LIMITS_CAD.min) {
    return `The minimum transfer is $${TRANSFER_LIMITS_CAD.min} CAD.`;
  }
  if (sendAmountCad > TRANSFER_LIMITS_CAD.max) {
    return `The maximum transfer in this demo is $${TRANSFER_LIMITS_CAD.max.toLocaleString("en-CA")} CAD.`;
  }
  return null;
}

/** Parse a user-typed amount such as "1,250.50". Returns NaN when empty/invalid. */
export function parseAmountInput(raw: string): number {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (cleaned === "" || cleaned === ".") return Number.NaN;
  return Number.parseFloat(cleaned);
}
