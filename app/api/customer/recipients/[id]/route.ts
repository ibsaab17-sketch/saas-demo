import { NextResponse } from "next/server";

import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function DELETE(
  _request: Request,
  context: RouteContext,
) {
  try {
    /*
     * Use the normal cookie-based client only
     * to verify who is signed in.
     */
    const supabase = await createClient();

    const {
      data: authData,
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json(
        {
          error: "You must be signed in.",
        },
        { status: 401 },
      );
    }

    /*
     * Now create the server-only admin client.
     *
     * It bypasses RLS, so we must explicitly
     * verify the customer and business before
     * touching the recipient.
     */
    const admin = createAdminClient();

    const {
      data: customer,
      error: customerError,
    } = await admin
      .from("customers")
      .select("id, business_id")
      .eq("user_id", authData.user.id)
      .eq("status", "active")
      .maybeSingle();

    if (customerError) {
      console.error(
        "Customer lookup failed:",
        customerError,
      );

      return NextResponse.json(
        {
          error:
            "Customer account could not be verified.",
        },
        { status: 500 },
      );
    }

    if (!customer) {
      return NextResponse.json(
        {
          error:
            "No active customer profile was found.",
        },
        { status: 403 },
      );
    }

    const { id: recipientId } =
      await context.params;

    if (!recipientId) {
      return NextResponse.json(
        {
          error: "Recipient ID is required.",
        },
        { status: 400 },
      );
    }

    /*
     * Archive only a recipient belonging to
     * this exact customer AND business.
     *
     * Never trust a customer_id or business_id
     * supplied by the browser.
     */
    const {
      data: recipient,
      error: archiveError,
    } = await admin
      .from("recipients")
      .update({
        status: "archived",
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", recipientId)
      .eq("customer_id", customer.id)
      .eq(
        "business_id",
        customer.business_id,
      )
      .eq("status", "active")
      .select("id")
      .maybeSingle();

    if (archiveError) {
      console.error(
        "Archive recipient database error:",
        archiveError,
      );

      return NextResponse.json(
        {
          error:
            "The recipient could not be removed.",
        },
        { status: 500 },
      );
    }

    /*
     * This also prevents a customer from
     * archiving another customer's recipient.
     */
    if (!recipient) {
      return NextResponse.json(
        {
          error:
            "Recipient was not found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      recipientId: recipient.id,
    });
  } catch (error) {
    console.error(
      "Archive recipient failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "The recipient could not be removed.",
      },
      { status: 500 },
    );
  }
}