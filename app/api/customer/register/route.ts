import { NextResponse } from "next/server";

import { checkRateLimit } from "../../../../utils/rate-limit";
import { createClient } from "../../../../utils/supabase/server";

type RegisterBody = {
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  phone?: unknown;
  password?: unknown;
  businessSlug?: unknown;
};

export async function POST(request: Request) {
  try {
    /*
     * Registration is public, so there is no authenticated
     * user ID available for rate limiting.
     *
     * Use the client IP instead.
     */
    const forwardedFor =
      request.headers.get("x-forwarded-for");

    const clientIp =
      forwardedFor?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const rateLimit = await checkRateLimit({
      key: `customer-register:${clientIp}`,
      limit: 5,
      windowSeconds: 900,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error:
            "Too many account creation attempts. Please wait and try again.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": "900",
          },
        },
      );
    }

    let body: RegisterBody;

    try {
      body =
        (await request.json()) as RegisterBody;
    } catch {
      return NextResponse.json(
        {
          error: "Invalid request body.",
        },
        {
          status: 400,
        },
      );
    }

    const firstName =
      typeof body.firstName === "string"
        ? body.firstName.trim()
        : "";

    const lastName =
      typeof body.lastName === "string"
        ? body.lastName.trim()
        : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const phone =
      typeof body.phone === "string"
        ? body.phone.trim()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    const businessSlug =
      typeof body.businessSlug === "string"
        ? body.businessSlug.trim().toLowerCase()
        : "";

    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !businessSlug
    ) {
      return NextResponse.json(
        {
          error:
            "First name, last name, email, password, and business are required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      password.length < 8 ||
      !/[A-Za-z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      return NextResponse.json(
        {
          error:
            "Password must be at least 8 characters and contain a letter and a number.",
        },
        {
          status: 400,
        },
      );
    }

    const supabase =
      await createClient();

    /*
     * Build the confirmation URL on the server.
     */
    const origin =
      new URL(request.url).origin;

    const { data, error } =
      await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            `${origin}/customer/auth/confirm`,
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: phone || null,
            business_slug: businessSlug,
          },
        },
      });

    if (error) {
      console.error(
        "Customer signup failed:",
        error.message,
      );

      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 400,
        },
      );
    }

    if (!data.user) {
      return NextResponse.json(
        {
          error:
            "Account creation failed. Please try again.",
        },
        {
          status: 500,
        },
      );
    }

    /*
     * If Supabase creates a session immediately,
     * create the customer profile as the old
     * client-side signup flow did.
     *
     * If email confirmation is required, there
     * may be no session yet.
     */
    if (data.session) {
      const { error: profileError } =
        await supabase.rpc(
          "register_customer",
          {
            p_business_slug:
              businessSlug,
            p_first_name:
              firstName,
            p_last_name:
              lastName,
            p_email:
              email,
            p_phone:
              phone || null,
          },
        );

      if (profileError) {
        console.error(
          "Customer profile creation failed:",
          profileError.message,
        );

        await supabase.auth.signOut();

        return NextResponse.json(
          {
            error:
              `Your account was created, but the customer profile could not be created: ${profileError.message}`,
          },
          {
            status: 500,
          },
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        requiresEmailConfirmation:
          !data.session,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "Unexpected registration API error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "An unexpected error occurred while creating your account.",
      },
      {
        status: 500,
      },
    );
  }
}