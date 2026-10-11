import { createClient } from "../../../../utils/supabase/client";

export interface SupabaseCurrentFee {
  feeCad: number;
  asOf: string;
}

export async function getSupabaseCurrentFee(): Promise<SupabaseCurrentFee> {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!user) {
    throw new Error("You must be signed in to view the transfer fee.");
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

  const { data: businessFee, error: feeError } = await supabase
    .from("business_fees")
    .select("fee_amount, created_at")
    .eq("business_id", customer.business_id)
    .eq("currency", "CAD")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (feeError) {
    throw new Error(feeError.message);
  }

  if (!businessFee) {
    throw new Error("No transfer fee is available.");
  }

  return {
    feeCad: Number(businessFee.fee_amount),
    asOf: businessFee.created_at,
  };
}