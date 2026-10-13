import { NextResponse } from "next/server";
import { createClient } from "../../../../../utils/supabase/server";
import { createAdminClient } from "../../../../../utils/supabase/admin";

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

    const admin = createAdminClient();

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
        "Admin transaction detail membership lookup failed:",
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
            "You do not have permission to view this transaction.",
        },
        { status: 403 },
      );
    }

    const { data: business, error: businessError } =
      await admin
        .from("businesses")
        .select("id, name, status")
        .eq("id", membership.business_id)
        .eq("status", "active")
        .maybeSingle();

    if (businessError) {
      console.error(
        "Admin transaction detail business lookup failed:",
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

    const { data: transaction, error: transactionError } =
      await admin
        .from("transactions")
        .select(
          "id, business_id, customer_id, recipient_id, base_currency, quote_currency, send_amount, fee_amount, fee_treatment, amount_to_convert, total_customer_pays, exchange_rate, recipient_amount, payment_method, payment_status, transaction_status, payment_proof_path, payment_proof_uploaded_at, payment_verified_at, payment_verified_by, processing_started_at, completed_at, completed_by, cancelled_at, customer_note, created_at, updated_at",
        )
        .eq("id", id)
        .eq("business_id", membership.business_id)
        .maybeSingle();

    if (transactionError) {
      console.error(
        "Admin transaction detail lookup failed:",
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

    const { data: customer, error: customerError } =
      await admin
        .from("customers")
        .select(
          "id, first_name, last_name, email, phone, status",
        )
        .eq("id", transaction.customer_id)
        .eq("business_id", membership.business_id)
        .maybeSingle();

    if (customerError) {
      console.error(
        "Admin transaction customer lookup failed:",
        customerError.message,
      );

      return NextResponse.json(
        { error: "Could not load the customer." },
        { status: 500 },
      );
    }

    const { data: recipient, error: recipientError } =
      await admin
        .from("recipients")
        .select(
          "id, recipient_type, first_name, middle_name, last_name, business_name, phone, bank_id, account_last4, sending_reason, status",
        )
        .eq("id", transaction.recipient_id)
        .eq("business_id", membership.business_id)
        .eq("customer_id", transaction.customer_id)
        .maybeSingle();

    if (recipientError) {
      console.error(
        "Admin transaction recipient lookup failed:",
        recipientError.message,
      );

      return NextResponse.json(
        { error: "Could not load the recipient." },
        { status: 500 },
      );
    }

    const customerName = customer
      ? [customer.first_name, customer.last_name]
          .filter(Boolean)
          .join(" ")
          .trim()
      : "Unknown customer";

    let recipientName = "Unknown recipient";

    if (recipient) {
      if (recipient.recipient_type === "business") {
        recipientName =
          recipient.business_name || "Business recipient";
      } else {
        recipientName =
          [
            recipient.first_name,
            recipient.middle_name,
            recipient.last_name,
          ]
            .filter(Boolean)
            .join(" ")
            .trim() || "Recipient";
      }
    }

    return NextResponse.json({
      transaction: {
        id: transaction.id,

        reference: transaction.id
          .replaceAll("-", "")
          .slice(0, 10)
          .toUpperCase(),

        createdAt: transaction.created_at,
        updatedAt: transaction.updated_at,

        business: {
          id: business.id,
          name: business.name,
        },

        customer: {
          id: customer?.id ?? transaction.customer_id,
          name: customerName,
          email: customer?.email ?? "",
          phone: customer?.phone ?? "",
          status: customer?.status ?? "",
        },

        recipient: {
          id: recipient?.id ?? transaction.recipient_id,
          name: recipientName,
          type: recipient?.recipient_type ?? "",
          bankId: recipient?.bank_id ?? "",
          accountLast4: recipient?.account_last4 ?? "",
          phone: recipient?.phone ?? "",
          sendingReason:
            recipient?.sending_reason ?? "",
          status: recipient?.status ?? "",
        },

        baseCurrency: transaction.base_currency,
        quoteCurrency: transaction.quote_currency,

        sendAmountCad: Number(
          transaction.send_amount,
        ),

        feeCad: Number(
          transaction.fee_amount,
        ),

        feeTreatment:
          transaction.fee_treatment,

        amountConvertedCad: Number(
          transaction.amount_to_convert,
        ),

        totalCad: Number(
          transaction.total_customer_pays,
        ),

        exchangeRate: Number(
          transaction.exchange_rate,
        ),

        recipientAmountEtb: Number(
          transaction.recipient_amount,
        ),

        paymentMethod:
          transaction.payment_method,

        paymentStatus:
          transaction.payment_status,

        transactionStatus:
          transaction.transaction_status,

        paymentProofAvailable: Boolean(
          transaction.payment_proof_path,
        ),

        paymentProofUploadedAt:
          transaction.payment_proof_uploaded_at,

        paymentVerifiedAt:
          transaction.payment_verified_at,

        processingStartedAt:
          transaction.processing_started_at,

        completedAt:
          transaction.completed_at,

        cancelledAt:
          transaction.cancelled_at,

        customerNote:
          transaction.customer_note ?? "",
      },
    });
  } catch (error) {
    console.error(
      "Admin transaction detail API error:",
      error,
    );

    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 },
    );
  }
}

export async function PATCH(
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

    const body = await request
      .json()
      .catch(() => null);

    if (
      !body ||
      ![
        "verify_payment",
        "start_processing",
        "complete_transaction",
      ].includes(body.action)
    ) {
      return NextResponse.json(
        { error: "Invalid transaction action." },
        { status: 400 },
      );
    }

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

    const admin = createAdminClient();

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
        "Transaction action membership lookup failed:",
        membershipError.message,
      );

      return NextResponse.json(
        {
          error:
            "Could not verify your business access.",
        },
        { status: 500 },
      );
    }

    if (!membership) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to update this transaction.",
        },
        { status: 403 },
      );
    }

    const {
      data: business,
      error: businessError,
    } = await admin
      .from("businesses")
      .select("id, status")
      .eq("id", membership.business_id)
      .eq("status", "active")
      .maybeSingle();

    if (businessError) {
      console.error(
        "Transaction action business lookup failed:",
        businessError.message,
      );

      return NextResponse.json(
        {
          error:
            "Could not verify the business.",
        },
        { status: 500 },
      );
    }

    if (!business) {
      return NextResponse.json(
        { error: "Business is not active." },
        { status: 403 },
      );
    }

    const {
      data: transaction,
      error: transactionError,
    } = await admin
      .from("transactions")
      .select(
        "id, business_id, payment_status, transaction_status, payment_proof_path, payment_verified_at, processing_started_at, completed_at",
      )
      .eq("id", id)
      .eq(
        "business_id",
        membership.business_id,
      )
      .maybeSingle();

    if (transactionError) {
      console.error(
        "Transaction action lookup failed:",
        transactionError.message,
      );

      return NextResponse.json(
        {
          error:
            "Could not load the transaction.",
        },
        { status: 500 },
      );
    }

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found." },
        { status: 404 },
      );
    }

    /*
     * COMPLETE TRANSACTION
     *
     * BusinessFlow itself does not move the money.
     * The owner should use this only after the
     * external transfer has actually been completed.
     */
    if (
      body.action === "complete_transaction"
    ) {
      if (
        transaction.payment_status !==
        "verified"
      ) {
        return NextResponse.json(
          {
            error:
              "The transaction cannot be completed until payment has been verified.",
          },
          { status: 409 },
        );
      }

      if (
        transaction.transaction_status !==
        "processing"
      ) {
        return NextResponse.json(
          {
            error:
              `The transaction cannot be completed while its status is "${transaction.transaction_status}".`,
          },
          { status: 409 },
        );
      }

      const completedAt =
        new Date().toISOString();

      const {
        data: updatedTransaction,
        error: updateError,
      } = await admin
        .from("transactions")
        .update({
          transaction_status: "completed",
          completed_at: completedAt,
          completed_by: user.id,
          updated_at: completedAt,
        })
        .eq("id", transaction.id)
        .eq(
          "business_id",
          membership.business_id,
        )
        .eq(
          "payment_status",
          "verified",
        )
        .eq(
          "transaction_status",
          "processing",
        )
        .select(
          "id, payment_status, transaction_status, payment_verified_at, processing_started_at, completed_at",
        )
        .maybeSingle();

      if (updateError) {
        console.error(
          "Complete transaction update failed:",
          updateError.message,
        );

        return NextResponse.json(
          {
            error:
              "Could not complete the transaction.",
          },
          { status: 500 },
        );
      }

      if (!updatedTransaction) {
        return NextResponse.json(
          {
            error:
              "The transaction changed before it could be completed. Please refresh and try again.",
          },
          { status: 409 },
        );
      }

      return NextResponse.json({
        success: true,

        message:
          "Transaction completed successfully.",

        transaction: {
          id: updatedTransaction.id,

          paymentStatus:
            updatedTransaction.payment_status,

          transactionStatus:
            updatedTransaction.transaction_status,

          paymentVerifiedAt:
            updatedTransaction.payment_verified_at,

          processingStartedAt:
            updatedTransaction.processing_started_at,

          completedAt:
            updatedTransaction.completed_at,
        },
      });
    }

    /*
     * START PROCESSING
     *
     * The owner can only start processing after
     * payment has already been independently
     * verified.
     */
    if (
      body.action === "start_processing"
    ) {
      if (
        transaction.payment_status !==
        "verified"
      ) {
        return NextResponse.json(
          {
            error:
              "Processing cannot start until the payment has been verified.",
          },
          { status: 409 },
        );
      }

      if (
        transaction.transaction_status !==
        "pending"
      ) {
        return NextResponse.json(
          {
            error:
              `Processing cannot start while the transaction is "${transaction.transaction_status}".`,
          },
          { status: 409 },
        );
      }

      const processingStartedAt =
        new Date().toISOString();

      const {
        data: updatedTransaction,
        error: updateError,
      } = await admin
        .from("transactions")
        .update({
          transaction_status: "processing",
          processing_started_at:
            processingStartedAt,
          updated_at:
            processingStartedAt,
        })
        .eq("id", transaction.id)
        .eq(
          "business_id",
          membership.business_id,
        )
        .eq(
          "payment_status",
          "verified",
        )
        .eq(
          "transaction_status",
          "pending",
        )
        .select(
          "id, payment_status, transaction_status, payment_verified_at, processing_started_at",
        )
        .maybeSingle();

      if (updateError) {
        console.error(
          "Start processing update failed:",
          updateError.message,
        );

        return NextResponse.json(
          {
            error:
              "Could not start processing the transaction.",
          },
          { status: 500 },
        );
      }

      if (!updatedTransaction) {
        return NextResponse.json(
          {
            error:
              "The transaction changed before processing could be started. Please refresh and try again.",
          },
          { status: 409 },
        );
      }

      return NextResponse.json({
        success: true,

        message:
          "Transaction processing started successfully.",

        transaction: {
          id: updatedTransaction.id,

          paymentStatus:
            updatedTransaction.payment_status,

          transactionStatus:
            updatedTransaction.transaction_status,

          paymentVerifiedAt:
            updatedTransaction.payment_verified_at,

          processingStartedAt:
            updatedTransaction.processing_started_at,
        },
      });
    }

    /*
     * VERIFY PAYMENT
     *
     * The owner must independently verify the
     * actual Interac e-Transfer before using
     * this action.
     */
    if (!transaction.payment_proof_path) {
      return NextResponse.json(
        {
          error:
            "Payment cannot be verified because no payment proof has been uploaded.",
        },
        { status: 409 },
      );
    }

    if (
      transaction.payment_status !==
      "proof_submitted"
    ) {
      return NextResponse.json(
        {
          error:
            `Payment cannot be verified while its status is "${transaction.payment_status}".`,
        },
        { status: 409 },
      );
    }

    if (
      transaction.transaction_status !==
      "pending"
    ) {
      return NextResponse.json(
        {
          error:
            `Payment cannot be verified while the transaction is "${transaction.transaction_status}".`,
        },
        { status: 409 },
      );
    }

    const verifiedAt =
      new Date().toISOString();

    const {
      data: updatedTransaction,
      error: updateError,
    } = await admin
      .from("transactions")
      .update({
        payment_status: "verified",
        payment_verified_at: verifiedAt,
        payment_verified_by: user.id,
        updated_at: verifiedAt,
      })
      .eq("id", transaction.id)
      .eq(
        "business_id",
        membership.business_id,
      )
      .eq(
        "payment_status",
        "proof_submitted",
      )
      .eq(
        "transaction_status",
        "pending",
      )
      .select(
        "id, payment_status, transaction_status, payment_verified_at",
      )
      .maybeSingle();

    if (updateError) {
      console.error(
        "Verify payment update failed:",
        updateError.message,
      );

      return NextResponse.json(
        {
          error:
            "Could not verify the payment.",
        },
        { status: 500 },
      );
    }

    if (!updatedTransaction) {
      return NextResponse.json(
        {
          error:
            "The transaction changed before payment verification could be completed. Please refresh and try again.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      success: true,

      message:
        "Payment verified successfully.",

      transaction: {
        id: updatedTransaction.id,

        paymentStatus:
          updatedTransaction.payment_status,

        transactionStatus:
          updatedTransaction.transaction_status,

        paymentVerifiedAt:
          updatedTransaction.payment_verified_at,
      },
    });
  } catch (error) {
    console.error(
      "Admin transaction action API error:",
      error,
    );

    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 },
    );
  }
}