import type { FeeOption } from "./types";

/**
 * DEMO pricing configuration.
 *
 * These values are synthetic and for UI testing only. In production the
 * exchange rate and fees must come from a server-side source and be
 * re-validated on the server when a transfer is submitted.
 */
export const DEMO_EXCHANGE_RATE_ETB_PER_CAD = 95.5;

export const DEMO_FEE_OPTIONS: FeeOption[] = [
  {
    id: "standard",
    label: "Standard",
    description: "Bank deposit in 1–2 business days",
    feeCad: 4.99,
  },
  {
    id: "express",
    label: "Express",
    description: "Bank deposit same day",
    feeCad: 9.99,
  },
];

export const TRANSFER_LIMITS_CAD = {
  min: 10,
  max: 5000,
};

export const DEFAULT_SEND_AMOUNT_CAD = 500;

/** Simulated network latency for demo services, in milliseconds. */
export const DEMO_LATENCY_MS = 450;

export const BRAND = {
  name: "BusinessFlow",
  product: "Customer Portal",
  tagline: "Send money from Canada to Ethiopia",
};
