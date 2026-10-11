import { createClient } from "../../../../utils/supabase/client";

export interface SupabaseCurrentRate {
  rate: number;
  asOf: string;
}

export async function getSupabaseCurrentRate(): Promise<SupabaseCurrentRate> {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!user) {
    throw new Error("You must be signed in to view the exchange rate.");
  }

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("business_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (customerError) {
    throw new Error(customerError.message);
  }

  if (!customer) {
    throw new Error("Active customer profile not found.");
  }

  const { data: exchangeRate, error: rateError } = await supabase
    .from("exchange_rates")
    .select("rate, created_at")
    .eq("business_id", customer.business_id)
    .eq("base_currency", "CAD")
    .eq("quote_currency", "ETB")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (rateError) {
    throw new Error(rateError.message);
  }

  if (!exchangeRate) {
    throw new Error("No exchange rate is available.");
  }

  return {
    rate: Number(exchangeRate.rate),
    asOf: exchangeRate.created_at,
  };
}