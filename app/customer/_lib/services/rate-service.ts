import { calculateQuote } from "../quote";
import type {
  DeliverySpeed,
  FeeOption,
  Quote,
} from "../types";
import { getSupabaseCurrentFee } from "./supabase-fee-service";
import { getSupabaseCurrentRate } from "./supabase-rate-service";

export interface RateService {
  getCurrentRate(): Promise<{
    rate: number;
    asOf: string;
  }>;

  getFeeOptions(): Promise<FeeOption[]>;

  getQuote(
    sendAmountCad: number,
    deliverySpeed: DeliverySpeed,
  ): Promise<Quote>;
}

export const rateService: RateService = {
  /**
   * Get the current exchange rate configured
   * by the customer's business.
   */
  async getCurrentRate() {
    const currentRate =
      await getSupabaseCurrentRate();

    return {
      rate: currentRate.rate,
      asOf: currentRate.asOf,
    };
  },

  /**
   * Get the current transfer fee configured
   * by the customer's business.
   *
   * We temporarily keep the existing FeeOption
   * structure so the rest of the customer portal
   * continues working while we transition away
   * from the old delivery-speed fee system.
   */
  async getFeeOptions() {
    const currentFee =
      await getSupabaseCurrentFee();

    const feeOptions: FeeOption[] = [
      {
        id: "standard",
        label: "Standard",
        description: "Business transfer fee",
        feeCad: currentFee.feeCad,
      },
      {
        id: "express",
        label: "Express",
        description: "Business transfer fee",
        feeCad: currentFee.feeCad,
      },
    ];

    return feeOptions;
  },

  /**
   * Build a quote using both the current
   * business exchange rate and transfer fee
   * from Supabase.
   */
  async getQuote(
    sendAmountCad,
    deliverySpeed,
  ) {
    const [currentRate, currentFee] =
      await Promise.all([
        getSupabaseCurrentRate(),
        getSupabaseCurrentFee(),
      ]);

    return calculateQuote(
      sendAmountCad,
      deliverySpeed,
      currentRate.rate,
      currentFee.feeCad,
    );
  },
};