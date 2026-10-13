import { NextResponse } from "next/server";

import { createAdminClient } from "../../../../utils/supabase/admin";
import { createClient } from "../../../../utils/supabase/server";

function makeReference(id: string) {
  return id
    .replace(/-/g, "")
    .slice(0, 10)
    .toUpperCase();
}

function makeCustomerName(customer: {
  first_name: string | null;
  last_name: string | null;
}) {
  return [
    customer.first_name,
    customer.last_name,
  ]
    .filter(Boolean)
    .join(" ");
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

export async function GET() {
  try {
    /*
     * Normal authenticated client:
     * used only to identify the
     * currently signed-in user.
     */
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
            "You must be signed in as a business administrator.",
        },
        {
          status: 401,
        },
      );
    }

    /*
     * Privileged server-only client.
     *
     * We NEVER accept business_id
     * from the browser.
     */
    const admin =
      createAdminClient();

    /*
     * Determine which business this
     * owner/admin belongs to.
     */
    const {
      data: membership,
      error: membershipError,
    } = await admin
      .from("business_members")
      .select(
        "business_id, role, status",
      )
      .eq(
        "user_id",
        user.id,
      )
      .eq(
        "status",
        "active",
      )
      .in(
        "role",
        ["owner", "admin"],
      )
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      console.error(
        "Admin transaction membership lookup failed:",
        membershipError.message,
      );

      return NextResponse.json(
        {
          error:
            "Could not verify your business access.",
        },
        {
          status: 500,
        },
      );
    }

    if (!membership) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to view business transactions.",
        },
        {
          status: 403,
        },
      );
    }

    /*
     * Confirm the business is active.
     */
    const {
      data: business,
      error: businessError,
    } = await admin
      .from("businesses")
      .select(
        "id, name, status",
      )
      .eq(
        "id",
        membership.business_id,
      )
      .eq(
        "status",
        "active",
      )
      .maybeSingle();

    if (businessError) {
      console.error(
        "Admin transaction business lookup failed:",
        businessError.message,
      );

      return NextResponse.json(
        {
          error:
            "Could not load the business.",
        },
        {
          status: 500,
        },
      );
    }

    if (!business) {
      return NextResponse.json(
        {
          error:
            "The business is not active.",
        },
        {
          status: 403,
        },
      );
    }

    /*
     * Load transactions belonging only
     * to the authenticated admin's
     * business.
     *
     * IMPORTANT:
     * Keep this SELECT as a literal
     * string so Supabase TypeScript
     * can infer the result type.
     */
    const {
      data: transactions,
      error: transactionsError,
    } = await admin
      .from("transactions")
      .select(
        "id, customer_id, recipient_id, created_at, send_amount, fee_amount, fee_treatment, amount_to_convert, total_customer_pays, exchange_rate, recipient_amount, payment_method, payment_status, transaction_status, payment_proof_path, payment_proof_uploaded_at, payment_verified_at, processing_started_at, completed_at, cancelled_at",
      )
      .eq(
        "business_id",
        business.id,
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      );

    if (transactionsError) {
      console.error(
        "Admin transactions query failed:",
        transactionsError.message,
      );

      return NextResponse.json(
        {
          error:
            "Could not load business transactions.",
        },
        {
          status: 500,
        },
      );
    }

    if (
      !transactions ||
      transactions.length === 0
    ) {
      return NextResponse.json(
        {
          business: {
            id: business.id,
            name: business.name,
          },

          transactions: [],
        },
        {
          status: 200,
        },
      );
    }

    /*
     * Collect the customer IDs referenced
     * by these business transactions.
     */
    const customerIds = [
      ...new Set(
        transactions.map(
          (transaction) =>
            transaction.customer_id,
        ),
      ),
    ];

    /*
     * Collect the recipient IDs referenced
     * by these business transactions.
     */
    const recipientIds = [
      ...new Set(
        transactions.map(
          (transaction) =>
            transaction.recipient_id,
        ),
      ),
    ];

    /*
     * Load safe customer information.
     */
    const {
      data: customers,
      error: customersError,
    } = await admin
      .from("customers")
      .select(
        "id, first_name, last_name, email",
      )
      .eq(
        "business_id",
        business.id,
      )
      .in(
        "id",
        customerIds,
      );

    if (customersError) {
      console.error(
        "Admin transaction customers query failed:",
        customersError.message,
      );

      return NextResponse.json(
        {
          error:
            "Could not load transaction customers.",
        },
        {
          status: 500,
        },
      );
    }

    /*
     * Load safe recipient information.
     *
     * We intentionally DO NOT select
     * account_number_encrypted here.
     */
    const {
      data: recipients,
      error: recipientsError,
    } = await admin
      .from("recipients")
      .select(
        "id, recipient_type, first_name, middle_name, last_name, business_name, phone, bank_id, sending_reason, account_last4",
      )
      .eq(
        "business_id",
        business.id,
      )
      .in(
        "id",
        recipientIds,
      );

    if (recipientsError) {
      console.error(
        "Admin transaction recipients query failed:",
        recipientsError.message,
      );

      return NextResponse.json(
        {
          error:
            "Could not load transaction recipients.",
        },
        {
          status: 500,
        },
      );
    }

    /*
     * Create lookup maps so we don't
     * repeatedly search the arrays.
     */
    const customerMap =
      new Map(
        (customers ?? []).map(
          (customer) => [
            customer.id,
            customer,
          ],
        ),
      );

    const recipientMap =
      new Map(
        (recipients ?? []).map(
          (recipient) => [
            recipient.id,
            recipient,
          ],
        ),
      );

    /*
     * Build the safe response for the
     * owner dashboard.
     *
     * We expose only whether proof exists.
     * We DO NOT expose the private
     * Supabase storage path.
     */
    const safeTransactions =
      transactions.map(
        (transaction) => {
          const customer =
            customerMap.get(
              transaction.customer_id,
            );

          const recipient =
            recipientMap.get(
              transaction.recipient_id,
            );

          return {
            id:
              transaction.id,

            reference:
              makeReference(
                transaction.id,
              ),

            createdAt:
              transaction.created_at,

            customer: {
              id:
                transaction.customer_id,

              name: customer
                ? makeCustomerName(
                    customer,
                  )
                : "Unknown customer",

              email:
                customer?.email ??
                "",
            },

            recipient: {
              id:
                transaction.recipient_id,

              name: recipient
                ? makeRecipientName(
                    recipient,
                  )
                : "Unknown recipient",

              bankId:
                recipient?.bank_id ??
                "",

              accountLast4:
                recipient?.account_last4 ??
                "",

              phone:
                recipient?.phone ??
                "",

              sendingReason:
                recipient?.sending_reason ??
                "",
            },

            sendAmountCad:
              Number(
                transaction.send_amount,
              ),

            feeCad:
              Number(
                transaction.fee_amount,
              ),

            feeTreatment:
              transaction.fee_treatment,

            amountConvertedCad:
              Number(
                transaction.amount_to_convert,
              ),

            totalCad:
              Number(
                transaction.total_customer_pays,
              ),

            exchangeRate:
              Number(
                transaction.exchange_rate,
              ),

            recipientAmountEtb:
              Number(
                transaction.recipient_amount,
              ),

            paymentMethod:
              transaction.payment_method,

            paymentStatus:
              transaction.payment_status,

            transactionStatus:
              transaction.transaction_status,

            paymentProofAvailable:
              Boolean(
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
          };
        },
      );

    return NextResponse.json(
      {
        business: {
          id:
            business.id,

          name:
            business.name,
        },

        transactions:
          safeTransactions,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "Unexpected admin transactions API error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "An unexpected error occurred while loading transactions.",
      },
      {
        status: 500,
      },
    );
  }
}