import { createClient } from "../utils/supabase/client";

export interface AdminBusiness {
  businessId: string;
  businessName: string;
  role: string;
}

export async function getAdminBusiness(): Promise<AdminBusiness> {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!user) {
    throw new Error("You must be signed in as an owner or administrator.");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("business_members")
    .select("business_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  if (!membership) {
    throw new Error("No active business membership was found.");
  }

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("id", membership.business_id)
    .eq("status", "active")
    .single();

  if (businessError) {
    throw new Error(businessError.message);
  }

  return {
    businessId: business.id,
    businessName: business.name,
    role: membership.role,
  };
}