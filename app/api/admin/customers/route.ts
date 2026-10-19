import { NextResponse } from "next/server";

import { createAdminClient } from "../../../../utils/supabase/admin";
import { createClient } from "../../../../utils/supabase/server";

export async function GET() {
  try {
    // Identify the currently signed-in user.
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "You must be signed in as a business administrator.",
        },
        {
          status: 401,
        },
      );
    }

    // Server-only privileged client.
    // Never accept business_id from the browser.
    const admin = createAdminClient();

    // Determine the business from the authenticated user's membership.
    const {
      data: membership,
      error: membershipError,
    } = await admin
      .from("business_members")
      .select("business_id, role, status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .in("role", ["owner", "admin"])
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      console.error(
        "Admin customer membership lookup failed:",
        membershipError.message,
      );

      return NextResponse.json(
        {
          error: "Could not verify your business access.",
        },
        {
          status: 500,
        },
      );
    }

    if (!membership) {
      return NextResponse.json(
        {
          error: "You do not have permission to view business customers.",
        },
        {
          status: 403,
        },
      );
    }

    // Confirm that the business is active.
    const {
      data: business,
      error: businessError,
    } = await admin
      .from("businesses")
      .select("id, name, status")
      .eq("id", membership.business_id)
      .eq("status", "active")
      .maybeSingle();

    if (businessError) {
      console.error(
        "Admin customer business lookup failed:",
        businessError.message,
      );

      return NextResponse.json(
        {
          error: "Could not load the business.",
        },
        {
          status: 500,
        },
      );
    }

    if (!business) {
      return NextResponse.json(
        {
          error: "The business is not active.",
        },
        {
          status: 403,
        },
      );
    }

    // Load ONLY customers belonging to this business.
    const {
      data: customers,
      error: customersError,
    } = await admin
      .from("customers")
      .select(
        "id, first_name, last_name, email, phone, status, created_at, updated_at",
      )
      .eq("business_id", business.id)
      .order("created_at", {
        ascending: false,
      });

    if (customersError) {
      console.error(
        "Admin customers query failed:",
        customersError.message,
      );

      return NextResponse.json(
        {
          error: "Could not load business customers.",
        },
        {
          status: 500,
        },
      );
    }

    // Return a deliberately limited customer representation.
    // user_id and business_id are not exposed to the browser.
    const safeCustomers = (customers ?? []).map((customer) => ({
      id: customer.id,

      name: [customer.first_name, customer.last_name]
        .filter(Boolean)
        .join(" "),

      firstName: customer.first_name,
      lastName: customer.last_name,
      email: customer.email,
      phone: customer.phone ?? "",
      status: customer.status,
      createdAt: customer.created_at,
      updatedAt: customer.updated_at,
    }));

    return NextResponse.json(
      {
        business: {
          id: business.id,
          name: business.name,
        },

        customers: safeCustomers,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "Unexpected admin customers API error:",
      error,
    );

    return NextResponse.json(
      {
        error: "An unexpected error occurred while loading customers.",
      },
      {
        status: 500,
      },
    );
  }
}