import { createClient } from "../../../../utils/supabase/client";
import type { Customer } from "../types";

const defaultNotificationPreferences = {
  emailTransferUpdates: true,
  smsTransferUpdates: false,
  rateAlerts: false,
  marketing: false,
};

export async function getSupabaseCustomerProfile(): Promise<Customer | null> {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("customers")
    .select(
      "id, first_name, last_name, email, phone, created_at, status",
    )
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email,
    phone: data.phone ?? "",
    createdAt: data.created_at,
    notificationPreferences:
      defaultNotificationPreferences,
  };
}