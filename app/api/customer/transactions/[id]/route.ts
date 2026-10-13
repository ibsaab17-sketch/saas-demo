import { NextResponse } from "next/server";

import { createAdminClient } from "../../../../../utils/supabase/admin";
import { createClient } from "../../../../../utils/supabase/server";

function makeReference(id: string) {
  return id
    .replace(/-/g, "")
    .slice(0, 10)
    .toUpperCase();
}

function makeRecipientName(recipient: {
  recipient_type: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  business_name: string | null;
}) {
  if (
    recipient.recipient_type === "business" &&
    recipient.business_name
  ) {
    return recipient.business_name;
  }

  return [
    recipient.first_name,
    recipient.middle_name,
    recipient.last_name,
  ]
    .filter(Boolean)
    .join(" ");
}

export async function GET(
  _request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const supabase =
      await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error:
            "You must be signed in to view this transaction.",
        },
        {
          status: 401,
        },
      );
    }

    const {
      id: transactionId,
    } = await context.params;

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

    const admin =
      createAdminClient();

    /*
     * Derive the customer and business
     * from the authenticated user.
     */
    const {
      data: customer,
      error: customerError,
    } = await admin
      .from("customers")
      .select(
        "id, business_id, first_name, last_name",
      )
      .eq(
        "user_id",
        user.id,
      )
      .eq(
        "status",
        "active",
      )
      .maybeSingle();

    if (customerError) {
      console.error(
        "Transaction detail customer lookup failed:",
        customerError.message,
      );

      return NextResponse.json(
        {
          error:
            "Could not load your customer profile.",
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
            "Active customer profile not found.",
        },
        {
          status: 403,
        },
      );
    }

    /*
     * Load only a transaction belonging
     * to this exact customer and business.
     */
    const {
      data: transaction,
      error: transactionError,
    } = await admin
      .from("transactions")
      .select(
        "id, recipient_id, created_at, send_amount, fee_amount, fee_treatment, amount_to_convert, total_customer_pays, exchange_rate, recipient_amount, transaction_status",
      )
      .eq(
        "id",
        transactionId,
      )
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
        "Transaction detail lookup failed:",
        transactionError.message,
      );

      return NextResponse.json(
        {
          error:
            "Could not load this transaction.",
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
     * Load the recipient belonging to
     * the same customer and business.
     *
     * Never select the encrypted/full
     * account number here.
     */
    const {
      data: recipient,
      error: recipientError,
    } = await admin
      .from("recipients")
      .select(
        "id, recipient_type, first_name, middle_name, last_name, business_name, phone, bank_id, sending_reason, account_last4",
      )
      .eq(
        "id",
        transaction.recipient_id,
      )
      .eq(
        "customer_id",
        customer.id,
      )
      .eq(
        "business_id",
        customer.business_id,
      )
      .maybeSingle();

    if (recipientError) {
      console.error(
        "Transaction detail recipient lookup failed:",
        recipientError.message,
      );

      return NextResponse.json(
        {
          error:
            "Could not load the transaction recipient.",
        },
        {
          status: 500,
        },
      );
    }

    if (!recipient) {
      return NextResponse.json(
        {
          error:
            "Transaction recipient not found.",
        },
        {
          status: 404,
        },
      );
    }

    const customerName = [
      customer.first_name,
      customer.last_name,
    ]
      .filter(Boolean)
      .join(" ");

    const recipientName =
      makeRecipientName(
        recipient,
      );

    /*
     * Return the same Transaction shape
     * used by the customer portal.
     */
    return NextResponse.json(
      {
        transaction: {
          id:
            transaction.id,

          reference:
            makeReference(
              transaction.id,
            ),

          createdAt:
            transaction.created_at,

          status:
            transaction.transaction_status,

          customerId:
            customer.id,

          customerName,

          recipient: {
            id:
              recipient.id,

            displayName:
              recipientName,

            phone:
              recipient.phone,

            bankName:
              recipient.bank_id,

            accountLast4:
              recipient.account_last4,

            sendingReason:
              recipient.sending_reason,
          },

          sendAmountCad:
            Number(
              transaction.send_amount,
            ),

          amountConvertedCad:
            Number(
              transaction.amount_to_convert,
            ),

          exchangeRate:
            Number(
              transaction.exchange_rate,
            ),

          feeCad:
            Number(
              transaction.fee_amount,
            ),

          feeIncludedInAmount:
            transaction.fee_treatment ===
            "deducted",

          totalCad:
            Number(
              transaction.total_customer_pays,
            ),

          receiveAmountEtb:
            Number(
              transaction.recipient_amount,
            ),

          deliverySpeed:
            "standard",

          
        },
      },
      {
        status: 200,
      },
    );
  } catch (err) {
    console.error(
      "Unexpected transaction detail API error:",
      err,
    );

    return NextResponse.json(
      {
        error:
          "An unexpected error occurred while loading this transaction.",
      },
      {
        status: 500,
      },
    );
  }
}