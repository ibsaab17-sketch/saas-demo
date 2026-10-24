import { NextResponse } from "next/server";

import { createAdminClient } from "../../../../utils/supabase/admin";
import { createClient } from "../../../../utils/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "You must be signed in as a business administrator." },
        { status: 401 },
      );
    }

    const admin = createAdminClient();

    const { data: membership, error: membershipError } = await admin
      .from("business_members")
      .select("business_id, role, status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .in("role", ["owner", "admin"])
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      console.error(
        "Admin employee membership lookup failed:",
        membershipError.message,
      );

      return NextResponse.json(
        { error: "Could not verify your business access." },
        { status: 500 },
      );
    }

    if (!membership) {
      return NextResponse.json(
        { error: "You do not have permission to view business employees." },
        { status: 403 },
      );
    }

    const { data: business, error: businessError } = await admin
      .from("businesses")
      .select("id, name, status")
      .eq("id", membership.business_id)
      .eq("status", "active")
      .maybeSingle();

    if (businessError) {
      console.error(
        "Admin employee business lookup failed:",
        businessError.message,
      );

      return NextResponse.json(
        { error: "Could not load the business." },
        { status: 500 },
      );
    }

    if (!business) {
      return NextResponse.json(
        { error: "The business is not active." },
        { status: 403 },
      );
    }

    const { data: members, error: membersError } = await admin
      .from("business_members")
      .select("id, user_id, role, status, created_at")
      .eq("business_id", business.id)
      .order("created_at", { ascending: true });

    if (membersError) {
      console.error(
        "Admin employees query failed:",
        membersError.message,
      );

      return NextResponse.json(
        { error: "Could not load business employees." },
        { status: 500 },
      );
    }

    const employees = await Promise.all(
      (members ?? []).map(async (member) => {
        const { data: authUserData, error: authUserError } =
          await admin.auth.admin.getUserById(member.user_id);

        if (authUserError) {
          console.error(
            `Could not load auth user ${member.user_id}:`,
            authUserError.message,
          );
        }

        return {
          id: member.id,
          email: authUserData?.user?.email ?? "Email unavailable",
          role: member.role,
          status: member.status,
          createdAt: member.created_at,
        };
      }),
    );

    return NextResponse.json(
      {
        business: {
          id: business.id,
          name: business.name,
        },
        employees,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Unexpected admin employees API error:", error);

    return NextResponse.json(
      {
        error:
          "An unexpected error occurred while loading business employees.",
      },
      { status: 500 },
    );
  }
}