import { createClient } from "../../../../utils/supabase/client";

export interface SupabaseCustomerSession {
  userId: string;
  email: string;
}

export async function getSupabaseSession(): Promise<SupabaseCustomerSession | null> {
  const supabase = createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return {
    userId: user.id,
    email: user.email ?? "",
  };
}

export async function signInWithSupabase(
  email: string,
  password: string,
): Promise<SupabaseCustomerSession> {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error("Sign in failed. Please try again.");
  }

  return {
    userId: data.user.id,
    email: data.user.email ?? "",
  };
}

export async function signUpWithSupabase(
  firstName: string,
  lastName: string,
  email: string,
  phone: string,
  password: string,
  businessSlug: string,
): Promise<void> {
  const supabase = createClient();

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedBusinessSlug = businessSlug.trim().toLowerCase();

  if (!normalizedBusinessSlug) {
    throw new Error(
      "A business is required to create your customer account.",
    );
  }

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/customer/auth/confirm`,
      data: {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || null,
        business_slug: normalizedBusinessSlug,
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error("Account creation failed. Please try again.");
  }

  // Supabase email confirmation is enabled.
  // If there is no session yet, the customer confirms their email first.
  if (!data.session) {
    return;
  }

  const { error: profileError } = await supabase.rpc("register_customer", {
    p_business_slug: normalizedBusinessSlug,
    p_first_name: firstName.trim(),
    p_last_name: lastName.trim(),
    p_email: normalizedEmail,
    p_phone: phone.trim() || null,
  });

  if (profileError) {
    await supabase.auth.signOut();

    throw new Error(
      `Your account was created, but the customer profile could not be created: ${profileError.message}`,
    );
  }
}

export async function signOutFromSupabase(): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}