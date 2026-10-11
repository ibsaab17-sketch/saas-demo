
import { NextRequest, NextResponse } from "next/server";

import { createClient } from "../../../../utils/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL("/customer/login?error=invalid_confirmation_link", request.url),
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(
      new URL("/customer/login?error=confirmation_failed", request.url),
    );
  }

  const user = data.user;

  const firstName =
    typeof user.user_metadata?.first_name === "string"
      ? user.user_metadata.first_name.trim()
      : "";

  const lastName =
    typeof user.user_metadata?.last_name === "string"
      ? user.user_metadata.last_name.trim()
      : "";

  const phone =
    typeof user.user_metadata?.phone === "string"
      ? user.user_metadata.phone.trim()
      : "";

  const businessSlug =
    typeof user.user_metadata?.business_slug === "string"
      ? user.user_metadata.business_slug.trim()
      : "";

  if (!firstName || !lastName || !businessSlug || !user.email) {
    return NextResponse.redirect(
      new URL("/customer/login?error=registration_incomplete", request.url),
    );
  }

  const { data: existingCustomer, error: lookupError } = await supabase
    .from("customers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.redirect(
      new URL("/customer/login?error=profile_lookup_failed", request.url),
    );
  }

  if (!existingCustomer) {
    const { error: profileError } = await supabase.rpc("register_customer", {
      p_business_slug: businessSlug,
      p_first_name: firstName,
      p_last_name: lastName,
      p_email: user.email,
      p_phone: phone || null,
    });

    if (profileError) {
      return NextResponse.redirect(
        new URL("/customer/login?error=profile_creation_failed", request.url),
      );
    }
  }

  return NextResponse.redirect(
    new URL("/customer/dashboard", request.url),
  );
}