/**
 * Customer portal configuration.
 *
 * Exchange rates and transfer fees are not defined here.
 * They are loaded from the customer's business pricing
 * configuration in Supabase.
 */

export const TRANSFER_LIMITS_CAD = {
  min: 10,
  max: 5000,
};

export const DEFAULT_SEND_AMOUNT_CAD = 500;

export const BRAND = {
  name: "BusinessFlow",
  product: "Customer Portal",
  tagline: "Manage transfer requests from Canada to Ethiopia",
};