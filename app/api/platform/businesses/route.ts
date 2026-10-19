import { NextResponse } from "next/server";

import { createAdminClient } from "../../../../utils/supabase/admin";
import { createClient } from "../../../../utils/supabase/server";

interface CreateBusinessRequest {
  businessName?: string;
  businessSlug?: string;
  ownerEmail?: string;
  ownerPassword?: string;
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(request: Request) {
  try {
    /*
     * Authenticate the person making the request
     * using the normal Supabase session.
     */
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "You must be signed in.",
        },
        {
          status: 401,
        },
      );
    }

    /*
     * Use the server-only admin client only after
     * authenticating the current user.
     */
    const admin = createAdminClient();

    /*
     * Only an active BusinessFlow platform
     * administrator can create businesses
     * and owner accounts.
     */
    const {
      data: platformUser,
      error: platformUserError,
    } = await admin
      .from("platform_users")
      .select("user_id, role, status")
      .eq("user_id", user.id)
      .eq("role", "platform_admin")
      .eq("status", "active")
      .maybeSingle();

    if (platformUserError) {
      console.error(
        "Platform administrator lookup failed:",
        platformUserError.message,
      );

      return NextResponse.json(
        {
          error:
            "Could not verify platform administrator access.",
        },
        {
          status: 500,
        },
      );
    }

    if (!platformUser) {
      return NextResponse.json(
        {
          error:
            "Platform administrator access is required.",
        },
        {
          status: 403,
        },
      );
    }

    let body: CreateBusinessRequest;

    try {
      body =
        (await request.json()) as CreateBusinessRequest;
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

    const businessName =
      body.businessName?.trim() ?? "";

    const businessSlug = normalizeSlug(
      body.businessSlug?.trim() ||
        businessName,
    );

    const ownerEmail =
      body.ownerEmail?.trim().toLowerCase() ?? "";

    const ownerPassword =
      body.ownerPassword ?? "";

    if (!businessName) {
      return NextResponse.json(
        {
          error: "Business name is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (!businessSlug) {
      return NextResponse.json(
        {
          error: "Business slug is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (!ownerEmail) {
      return NextResponse.json(
        {
          error: "Owner email is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !ownerEmail.includes("@") ||
      ownerEmail.startsWith("@") ||
      ownerEmail.endsWith("@")
    ) {
      return NextResponse.json(
        {
          error: "Enter a valid owner email address.",
        },
        {
          status: 400,
        },
      );
    }

    if (ownerPassword.length < 8) {
      return NextResponse.json(
        {
          error:
            "Owner password must be at least 8 characters.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Do not create a duplicate business slug.
     */
    const {
      data: existingBusiness,
      error: existingBusinessError,
    } = await admin
      .from("businesses")
      .select("id")
      .eq("slug", businessSlug)
      .maybeSingle();

    if (existingBusinessError) {
      console.error(
        "Business duplicate check failed:",
        existingBusinessError.message,
      );

      return NextResponse.json(
        {
          error:
            "Could not verify the business information.",
        },
        {
          status: 500,
        },
      );
    }

    if (existingBusiness) {
      return NextResponse.json(
        {
          error:
            "A business with this slug already exists.",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * For the first production version, require
     * a new email address for each owner account.
     *
     * We do not automatically reuse an existing
     * customer or owner Auth account.
     */
    const {
      data: existingUsers,
      error: existingUsersError,
    } =
      await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

    if (existingUsersError) {
      console.error(
        "Owner account duplicate check failed:",
        existingUsersError.message,
      );

      return NextResponse.json(
        {
          error:
            "Could not verify the owner account.",
        },
        {
          status: 500,
        },
      );
    }

    const existingOwner =
      existingUsers.users.find(
        (existingUser) =>
          existingUser.email?.toLowerCase() ===
          ownerEmail,
      );

    if (existingOwner) {
      return NextResponse.json(
        {
          error:
            "An account with this owner email already exists.",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * Create the business first.
     */
    const {
      data: business,
      error: businessError,
    } = await admin
      .from("businesses")
      .insert({
        name: businessName,
        slug: businessSlug,
        status: "active",
      })
      .select("id, name, slug, status")
      .single();

    if (businessError || !business) {
      console.error(
        "Business creation failed:",
        businessError?.message,
      );

      return NextResponse.json(
        {
          error: "Could not create the business.",
        },
        {
          status: 500,
        },
      );
    }

    /*
     * Create the owner's Supabase Auth account.
     *
     * email_confirm is true because the platform
     * administrator is creating this pilot owner
     * account directly.
     */
    const {
      data: ownerAuth,
      error: ownerAuthError,
    } =
      await admin.auth.admin.createUser({
        email: ownerEmail,
        password: ownerPassword,
        email_confirm: true,
      });

    if (
      ownerAuthError ||
      !ownerAuth.user
    ) {
      /*
       * Roll back the newly-created business if
       * owner creation fails.
       */
      const { error: rollbackBusinessError } =
        await admin
          .from("businesses")
          .delete()
          .eq("id", business.id);

      if (rollbackBusinessError) {
        console.error(
          "Business rollback failed:",
          rollbackBusinessError.message,
        );
      }

      console.error(
        "Owner Auth account creation failed:",
        ownerAuthError?.message,
      );

      return NextResponse.json(
        {
          error:
            "Could not create the owner account.",
        },
        {
          status: 500,
        },
      );
    }

    /*
     * Link the new Auth user to the new business
     * as its active owner.
     */
    const {
      data: membership,
      error: membershipError,
    } = await admin
      .from("business_members")
      .insert({
        business_id: business.id,
        user_id: ownerAuth.user.id,
        role: "owner",
        status: "active",
      })
      .select(
        "id, business_id, user_id, role, status",
      )
      .single();

    if (
      membershipError ||
      !membership
    ) {
      /*
       * Roll back both records if membership
       * creation fails.
       */
      const { error: deleteUserError } =
        await admin.auth.admin.deleteUser(
          ownerAuth.user.id,
        );

      if (deleteUserError) {
        console.error(
          "Owner rollback failed:",
          deleteUserError.message,
        );
      }

      const { error: deleteBusinessError } =
        await admin
          .from("businesses")
          .delete()
          .eq("id", business.id);

      if (deleteBusinessError) {
        console.error(
          "Business rollback failed:",
          deleteBusinessError.message,
        );
      }

      console.error(
        "Owner membership creation failed:",
        membershipError?.message,
      );

      return NextResponse.json(
        {
          error:
            "Could not create the owner membership.",
        },
        {
          status: 500,
        },
      );
    }

    /*
     * Never return the password or secret key.
     */
    return NextResponse.json(
      {
        business: {
          id: business.id,
          name: business.name,
          slug: business.slug,
          status: business.status,
        },

        owner: {
          userId: ownerAuth.user.id,
          email: ownerAuth.user.email,
          role: membership.role,
          status: membership.status,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "Unexpected platform business creation error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "An unexpected error occurred while creating the business.",
      },
      {
        status: 500,
      },
    );
  }
}