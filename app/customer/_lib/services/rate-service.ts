import { DEMO_EXCHANGE_RATE_ETB_PER_CAD, DEMO_FEE_OPTIONS } from "../config";
import { calculateQuote } from "../quote";
import type { DeliverySpeed, FeeOption, Quote } from "../types";

/**
 * RateService — exchange rate and fee lookup.
 *
 * PRODUCTION: fetch the current rate/fees from the server (never trust a
 * client-provided rate), and re-validate the quote server-side on submit.
 */
export interface RateService {
  getCurrentRate(): Promise<{ rate: number; asOf: string; isDemoRate: true }>;
  getFeeOptions(): Promise<FeeOption[]>;
  getQuote(sendAmountCad: number, deliverySpeed: DeliverySpeed): Promise<Quote>;
}

export const demoRateService: RateService = {
  async getCurrentRate() {
    return {
      rate: DEMO_EXCHANGE_RATE_ETB_PER_CAD,
      asOf: new Date().toISOString(),
      isDemoRate: true,
    };
  },
  async getFeeOptions() {
    return DEMO_FEE_OPTIONS;
  },
  async getQuote(sendAmountCad, deliverySpeed) {
    return calculateQuote(sendAmountCad, deliverySpeed, DEMO_EXCHANGE_RATE_ETB_PER_CAD);
  },
};

export const rateService: RateService = demoRateService;
