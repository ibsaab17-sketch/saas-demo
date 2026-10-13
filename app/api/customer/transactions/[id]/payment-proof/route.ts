import { NextResponse } from "next/server";

import { createAdminClient } from "../../../../../../utils/supabase/admin";
import { createClient } from "../../../../../../utils/supabase/server";

const PAYMENT_PROOF_BUCKET = "payment-proofs";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_FILE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

function extensionForFile(file: File) {
  switch (file.type) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "application/pdf":
      return "pdf";
    default:
      return null;
  }
}

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    /*
     * 1. Authenticate the customer using
     * the normal cookie-based Supabase
     * client.
     */
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error:
            "You must be signed in to upload payment proof.",
        },
        {
          status: 401,
        },
      );
    }

    const { id: transactionId } =
      await context.params;

    if (!transactionId) {
      return NextResponse.json(
        {
          error:
            "Transaction ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * 2. Read the uploaded file.
     */
    const formData =
      await request.formData();

    const uploadedFile =
      formData.get("file");

    if (!(uploadedFile instanceof File)) {
      return NextResponse.json(
        {
          error:
            "Please select a payment proof file.",
        },
        {
          status: 400,
        },
      );
    }

    if (uploadedFile.size <= 0) {
      return NextResponse.json(
        {
          error:
            "The selected file is empty.",
        },
        {
          status: 400,
        },
      );
    }

    if (uploadedFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error:
            "Payment proof must be 10 MB or smaller.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !ALLOWED_FILE_TYPES.has(
        uploadedFile.type,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Only JPG, PNG, WebP, or PDF files are allowed.",
        },
        {
          status: 400,
        },
      );
    }

    const extension =
      extensionForFile(uploadedFile);

    if (!extension) {
      return NextResponse.json(
        {
          error:
            "Unsupported payment proof file type.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * 3. Use the privileged server-only
     * client after authentication.
     */
    const admin =
      createAdminClient();

    /*
     * 4. Determine the authenticated
     * customer's business/customer IDs.
     *
     * Never accept these IDs from the
     * browser.
     */
    const {
      data: customer,
      error: customerError,
    } = await admin
      .from("customers")
      .select(
        "id,business_id,status",
      )
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (customerError) {
      console.error(
        "Payment proof customer lookup failed:",
        customerError,
      );

      return NextResponse.json(
        {
          error:
            "Could not verify the customer account.",
        },
        {
          status: 500,
        },
      );
    }

    if (!customer) {
      return NextResponse.json(
        {
          error:
            "An active customer account was not found.",
        },
        {
          status: 403,
        },
      );
    }

    /*
     * 5. Verify that this exact transaction
     * belongs to this customer AND this
     * business.
     */
    const {
      data: transaction,
      error: transactionError,
    } = await admin
      .from("transactions")
      .select(
        "id,business_id,customer_id,payment_status,transaction_status,payment_proof_path",
      )
      .eq("id", transactionId)
      .eq(
        "customer_id",
        customer.id,
      )
      .eq(
        "business_id",
        customer.business_id,
      )
      .maybeSingle();

    if (transactionError) {
      console.error(
        "Payment proof transaction lookup failed:",
        transactionError,
      );

      return NextResponse.json(
        {
          error:
            "Could not verify the transaction.",
        },
        {
          status: 500,
        },
      );
    }

    if (!transaction) {
      return NextResponse.json(
        {
          error:
            "Transaction not found.",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * Completed or cancelled transactions
     * should not accept new customer proof.
     */
    if (
      transaction.transaction_status ===
        "completed" ||
      transaction.transaction_status ===
        "cancelled"
    ) {
      return NextResponse.json(
        {
          error:
            "Payment proof cannot be changed for this transaction.",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * Once payment is verified, the customer
     * should not replace the proof.
     */
    if (
      transaction.payment_status ===
      "verified"
    ) {
      return NextResponse.json(
        {
          error:
            "Payment has already been verified.",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * 6. Build a private storage path.
     *
     * business/customer/transaction/proof.ext
     *
     * These IDs all came from the server,
     * not from the browser.
     */
    const storagePath = [
      customer.business_id,
      customer.id,
      transaction.id,
      `proof.${extension}`,
    ].join("/");

    const fileBuffer =
      Buffer.from(
        await uploadedFile.arrayBuffer(),
      );

    /*
     * 7. Upload to the PRIVATE bucket.
     *
     * upsert allows the customer to replace
     * proof while it is still awaiting
     * verification.
     */
    const {
      error: uploadError,
    } = await admin.storage
      .from(PAYMENT_PROOF_BUCKET)
      .upload(
        storagePath,
        fileBuffer,
        {
          contentType:
            uploadedFile.type,
          upsert: true,
        },
      );

    if (uploadError) {
      console.error(
        "Payment proof upload failed:",
        uploadError,
      );

      return NextResponse.json(
        {
          error:
            "Could not upload the payment proof.",
        },
        {
          status: 500,
        },
      );
    }

    /*
     * 8. Update the transaction only after
     * the private upload succeeds.
     */
    const {
      data: updatedTransaction,
      error: updateError,
    } = await admin
      .from("transactions")
      .update({
        payment_proof_path:
          storagePath,

        payment_proof_uploaded_at:
          new Date().toISOString(),

        payment_status:
          "proof_submitted",

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        transaction.id,
      )
      .eq(
        "customer_id",
        customer.id,
      )
      .eq(
        "business_id",
        customer.business_id,
      )
      .select(
        "id,payment_status,transaction_status,payment_proof_uploaded_at",
      )
      .single();

    if (updateError) {
      console.error(
        "Payment proof transaction update failed:",
        updateError,
      );

      /*
       * Avoid leaving an orphaned proof file
       * if the database update fails.
       */
      await admin.storage
        .from(
          PAYMENT_PROOF_BUCKET,
        )
        .remove([
          storagePath,
        ]);

      return NextResponse.json(
        {
          error:
            "The proof was uploaded, but the transaction could not be updated.",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(
      {
        success: true,

        transaction: {
          id:
            updatedTransaction.id,

          paymentStatus:
            updatedTransaction.payment_status,

          transactionStatus:
            updatedTransaction.transaction_status,

          paymentProofUploadedAt:
            updatedTransaction.payment_proof_uploaded_at,
        },
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "Unexpected payment proof upload error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "An unexpected error occurred while uploading payment proof.",
      },
      {
        status: 500,
      },
    );
  }
}