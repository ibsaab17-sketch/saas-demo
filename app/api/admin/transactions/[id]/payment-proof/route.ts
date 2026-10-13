import { NextResponse } from "next/server";
import { createClient } from "../../../../../../utils/supabase/server";
import { createAdminClient } from "../../../../../../utils/supabase/admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  request: Request,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Transaction ID is required." },
        { status: 400 },
      );
    }

    // Identify the currently signed-in user.
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "You must be signed in." },
        { status: 401 },
      );
    }

    // Server-only privileged client.
    const admin = createAdminClient();

    // Verify that this user is an active owner/admin.
    const { data: membership, error: membershipError } =
      await admin
        .from("business_members")
        .select("business_id, role, status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .in("role", ["owner", "admin"])
        .limit(1)
        .maybeSingle();

    if (membershipError) {
      console.error(
        "Admin payment proof membership lookup failed:",
        membershipError.message,
      );

      return NextResponse.json(
        { error: "Could not verify your business access." },
        { status: 500 },
      );
    }

    if (!membership) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to view this payment proof.",
        },
        { status: 403 },
      );
    }

    // Make sure the business is active.
    const { data: business, error: businessError } =
      await admin
        .from("businesses")
        .select("id, status")
        .eq("id", membership.business_id)
        .eq("status", "active")
        .maybeSingle();

    if (businessError) {
      console.error(
        "Admin payment proof business lookup failed:",
        businessError.message,
      );

      return NextResponse.json(
        { error: "Could not verify the business." },
        { status: 500 },
      );
    }

    if (!business) {
      return NextResponse.json(
        { error: "Business is not active." },
        { status: 403 },
      );
    }

    // Load only this transaction from the owner's business.
    const { data: transaction, error: transactionError } =
      await admin
        .from("transactions")
        .select(
          "id, business_id, payment_proof_path, payment_proof_uploaded_at",
        )
        .eq("id", id)
        .eq("business_id", membership.business_id)
        .maybeSingle();

    if (transactionError) {
      console.error(
        "Admin payment proof transaction lookup failed:",
        transactionError.message,
      );

      return NextResponse.json(
        { error: "Could not load the transaction." },
        { status: 500 },
      );
    }

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found." },
        { status: 404 },
      );
    }

    if (!transaction.payment_proof_path) {
      return NextResponse.json(
        {
          error:
            "No payment proof has been uploaded for this transaction.",
        },
        { status: 404 },
      );
    }

    // Extra protection:
    // uploaded proofs are stored under the business ID.
    const expectedPrefix = `${membership.business_id}/`;

    if (
      !transaction.payment_proof_path.startsWith(
        expectedPrefix,
      )
    ) {
      console.error(
        "Payment proof path does not match business:",
        transaction.id,
      );

      return NextResponse.json(
        { error: "Payment proof could not be accessed." },
        { status: 403 },
      );
    }

    // Generate a temporary signed URL.
    // The payment-proofs bucket remains private.
    const { data: signedData, error: signedError } =
      await admin.storage
        .from("payment-proofs")
        .createSignedUrl(
          transaction.payment_proof_path,
          60,
        );

    if (signedError || !signedData?.signedUrl) {
      console.error(
        "Admin payment proof signed URL failed:",
        signedError?.message,
      );

      return NextResponse.json(
        { error: "Could not open the payment proof." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      proof: {
        url: signedData.signedUrl,
        expiresInSeconds: 60,
        uploadedAt:
          transaction.payment_proof_uploaded_at,
      },
    });
  } catch (error) {
    console.error(
      "Admin payment proof API error:",
      error,
    );

    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 },
    );
  }
}