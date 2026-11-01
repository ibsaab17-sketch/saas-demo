import { NextResponse } from "next/server";

import { checkRateLimit } from "../../../../utils/rate-limit";
import { createClient } from "../../../../utils/supabase/server";

type LoginBody = {
  email?: unknown;
  password?: unknown;
};

export async function POST(request: Request) {
  try {
    const forwardedFor =
      request.headers.get("x-forwarded-for");

    const clientIp =
      forwardedFor?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const rateLimit = await checkRateLimit({
      key: `customer-login:${clientIp}`,
      limit: 10,
      windowSeconds: 900,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error:
            "Too many sign-in attempts. Please wait and try again.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": "900",
          },
        },
      );
    }

    let body: LoginBody;

    try {
      body =
        (await request.json()) as LoginBody;
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

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (!email || !password) {
      return NextResponse.json(
        {
          error:
            "Email and password are required.",
        },
        {
          status: 400,
        },
      );
    }

    const supabase =
      await createClient();

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error || !data.user) {
      return NextResponse.json(
        {
          error:
            "Invalid email or password.",
        },
        {
          status: 401,
        },
      );
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email ?? "",
        },
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "Unexpected login API error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "An unexpected error occurred while signing in.",
      },
      {
        status: 500,
      },
    );
  }
}