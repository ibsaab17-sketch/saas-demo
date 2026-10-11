import {
  DEMO_EXCHANGE_RATE_ETB_PER_CAD,
  DEMO_FEE_OPTIONS,
  TRANSFER_LIMITS_CAD,
} from "./config";

import type {
  DeliverySpeed,
  FeeOption,
  Quote,
} from "./types";

/**
 * Round money to 2 decimal places.
 */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Kept temporarily because some existing components still use
 * the delivery-speed labels.
 */
export function getFeeOption(speed: DeliverySpeed): FeeOption {
  return (
    DEMO_FEE_OPTIONS.find((option) => option.id === speed) ??
    DEMO_FEE_OPTIONS[0]
  );
}

/**
 * Calculate the transfer quote.
 *
 * feeIncludedInAmount = false:
 * $500 entered + $5 fee = $505 total
 * $500 is converted.
 *
 * feeIncludedInAmount = true:
 * $500 entered - $5 fee = $495 converted
 * $500 total is paid.
 */
export function calculateQuote(
  sendAmountCad: number,
  deliverySpeed: DeliverySpeed,
  exchangeRate: number = DEMO_EXCHANGE_RATE_ETB_PER_CAD,
  transferFeeCad: number = 0,
  feeIncludedInAmount: boolean = false,
): Quote {
  const amount =
    Number.isFinite(sendAmountCad) && sendAmountCad > 0
      ? roundMoney(sendAmountCad)
      : 0;

  const feeCad =
    amount > 0 &&
    Number.isFinite(transferFeeCad) &&
    transferFeeCad >= 0
      ? roundMoney(transferFeeCad)
      : 0;

  const amountConvertedCad = feeIncludedInAmount
    ? roundMoney(Math.max(amount - feeCad, 0))
    : amount;

  const totalCad = feeIncludedInAmount
    ? amount
    : roundMoney(amount + feeCad);

  const receiveAmountEtb = roundMoney(
    amountConvertedCad * exchangeRate,
  );

  return {
    sendAmountCad: amount,
    amountConvertedCad,
    exchangeRate,
    feeCad,
    feeIncludedInAmount,
    totalCad,
    receiveAmountEtb,
    deliverySpeed,
    quotedAt: new Date().toISOString(),
    isDemoRate: false,
  };
}

/**
 * Validate the customer's entered amount.
 */
export function validateSendAmount(
  sendAmountCad: number,
  transferFeeCad: number = 0,
  feeIncludedInAmount: boolean = false,
): string | null {
  if (!Number.isFinite(sendAmountCad) || sendAmountCad <= 0) {
    return "Enter an amount to send.";
  }

  if (sendAmountCad < TRANSFER_LIMITS_CAD.min) {
    return `The minimum transfer is $${TRANSFER_LIMITS_CAD.min} CAD.`;
  }

  if (sendAmountCad > TRANSFER_LIMITS_CAD.max) {
    return `The maximum transfer is $${TRANSFER_LIMITS_CAD.max.toLocaleString(
      "en-CA",
    )} CAD.`;
  }

  if (feeIncludedInAmount && sendAmountCad <= transferFeeCad) {
    return "The sending amount must be greater than the transfer fee.";
  }

  return null;
}

/**
 * Parse an amount such as "1,250.50".
 */
export function parseAmountInput(raw: string): number {
  const cleaned = raw.replace(/[^0-9.]/g, "");

  if (cleaned === "" || cleaned === ".") {
    return Number.NaN;
  }

  return Number.parseFloat(cleaned);
}