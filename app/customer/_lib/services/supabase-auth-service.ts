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
  const response = await fetch(
    "/api/customer/login",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    },
  );

  const result =
    (await response.json()) as {
      success?: boolean;
      error?: string;
      user?: {
        id: string;
        email: string;
      };
    };

  if (!response.ok) {
    throw new Error(
      result.error ||
        "Sign in failed. Please try again.",
    );
  }

  if (!result.user) {
    throw new Error(
      "Sign in failed. Please try again.",
    );
  }

  return {
    userId: result.user.id,
    email: result.user.email,
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
  const response = await fetch(
    "/api/customer/register",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        phone,
        password,
        businessSlug,
      }),
    },
  );

  const result =
    (await response.json()) as {
      success?: boolean;
      error?: string;
      requiresEmailConfirmation?: boolean;
    };

  if (!response.ok) {
    throw new Error(
      result.error ||
        "Could not create your account. Please try again.",
    );
  }

  if (!result.success) {
    throw new Error(
      "Account creation failed. Please try again.",
    );
  }
}

export async function signOutFromSupabase(): Promise<void> {
  const supabase = createClient();

  const { error } =
    await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}