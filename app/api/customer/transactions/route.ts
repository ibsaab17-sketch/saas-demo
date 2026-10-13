import { NextResponse } from "next/server";

import { createAdminClient } from "../../../../utils/supabase/admin";
import { createClient } from "../../../../utils/supabase/server";

type CreateTransactionBody = {
  recipientId?: unknown;
  sendAmountCad?: unknown;
  feeIncludedInAmount?: unknown;
};

function roundMoney(value: number) {
  return (
    Math.round(
      (value + Number.EPSILON) * 100,
    ) / 100
  );
}

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

export async function GET() {
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
            "You must be signed in to view transactions.",
        },
        {
          status: 401,
        },
      );
    }

    const admin =
      createAdminClient();

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
        "Transaction list customer lookup failed:",
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
     * Load only transactions belonging to
     * this exact customer and business.
     */
    const {
      data: transactions,
      error: transactionsError,
    } = await admin
      .from("transactions")
      .select(
        "id, recipient_id, created_at, send_amount, fee_amount, fee_treatment, amount_to_convert, total_customer_pays, exchange_rate, recipient_amount, transaction_status",
      )
      .eq(
        "customer_id",
        customer.id,
      )
      .eq(
        "business_id",
        customer.business_id,
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      );

    if (transactionsError) {
      console.error(
        "Transaction list lookup failed:",
        transactionsError.message,
      );

      return NextResponse.json(
        {
          error:
            "Could not load your transactions.",
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
          transactions: [],
        },
        {
          status: 200,
        },
      );
    }

    /*
     * Load only this customer's recipients.
     * Full/encrypted account numbers are NOT selected.
     */
    const recipientIds = [
      ...new Set(
        transactions.map(
          (transaction) =>
            transaction.recipient_id,
        ),
      ),
    ];

    const {
      data: recipients,
      error: recipientsError,
    } = await admin
      .from("recipients")
      .select(
        "id, recipient_type, first_name, middle_name, last_name, business_name, phone, bank_id, sending_reason, account_last4",
      )
      .eq(
        "customer_id",
        customer.id,
      )
      .eq(
        "business_id",
        customer.business_id,
      )
      .in(
        "id",
        recipientIds,
      );

    if (recipientsError) {
      console.error(
        "Transaction recipient list lookup failed:",
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

    const recipientMap =
      new Map(
        (recipients ?? []).map(
          (recipient) => [
            recipient.id,
            recipient,
          ],
        ),
      );

    const customerName = [
      customer.first_name,
      customer.last_name,
    ]
      .filter(Boolean)
      .join(" ");

    const result =
      transactions.flatMap(
        (transaction) => {
          const recipient =
            recipientMap.get(
              transaction.recipient_id,
            );

          /*
           * If a recipient cannot be matched,
           * do not expose a malformed transaction
           * to the browser.
           */
          if (!recipient) {
            return [];
          }

          return [
            {
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
                  makeRecipientName(
                    recipient,
                  ),

                phone:
                  recipient.phone,

                bankId:
                  recipient.bank_id,

                sendingReason:
                  recipient.sending_reason,

                accountLast4:
                  recipient.account_last4,
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
          ];
        },
      );

    return NextResponse.json(
      {
        transactions: result,
      },
      {
        status: 200,
      },
    );
  } catch (err) {
    console.error(
      "Unexpected transaction list API error:",
      err,
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

export async function POST(
  request: Request,
) {
  try {
    /*
     * Authenticate the customer using
     * their normal Supabase session.
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
            "You must be signed in to create a transaction.",
        },
        {
          status: 401,
        },
      );
    }

    /*
     * Only accept values the customer
     * is allowed to control.
     *
     * We DO NOT accept:
     * - business ID
     * - customer ID
     * - exchange rate
     * - transfer fee
     * - recipient amount
     * - transaction status
     */
    let body: CreateTransactionBody;

    try {
      body =
        (await request.json()) as CreateTransactionBody;
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid request body.",
        },
        {
          status: 400,
        },
      );
    }

    const recipientId =
      typeof body.recipientId ===
      "string"
        ? body.recipientId.trim()
        : "";

    const sendAmountCad =
      typeof body.sendAmountCad ===
      "number"
        ? body.sendAmountCad
        : Number.NaN;

    const feeIncludedInAmount =
      body.feeIncludedInAmount;

    if (!recipientId) {
      return NextResponse.json(
        {
          error:
            "A recipient is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !Number.isFinite(
        sendAmountCad,
      ) ||
      sendAmountCad <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Enter a valid send amount.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      typeof feeIncludedInAmount !==
      "boolean"
    ) {
      return NextResponse.json(
        {
          error:
            "A valid fee treatment is required.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Privileged database access.
     *
     * This client is server-only and
     * bypasses RLS, so every lookup below
     * explicitly checks ownership.
     */
    const admin =
      createAdminClient();

    /*
     * Find the active customer belonging
     * to the authenticated Auth user.
     *
     * Customer ID and business ID are
     * derived on the server.
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
        "Transaction customer lookup failed:",
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
     * Verify that the recipient belongs
     * to this exact customer and business.
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
        recipientId,
      )
      .eq(
        "customer_id",
        customer.id,
      )
      .eq(
        "business_id",
        customer.business_id,
      )
      .eq(
        "status",
        "active",
      )
      .maybeSingle();

    if (recipientError) {
      console.error(
        "Transaction recipient lookup failed:",
        recipientError.message,
      );

      return NextResponse.json(
        {
          error:
            "Could not verify the recipient.",
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
            "The selected recipient is not available.",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * Load the latest CAD -> ETB rate
     * for this business.
     */
    const {
      data: exchangeRateRow,
      error: rateError,
    } = await admin
      .from("exchange_rates")
      .select(
        "rate, created_at",
      )
      .eq(
        "business_id",
        customer.business_id,
      )
      .eq(
        "base_currency",
        "CAD",
      )
      .eq(
        "quote_currency",
        "ETB",
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      )
      .limit(1)
      .maybeSingle();

    if (rateError) {
      console.error(
        "Transaction rate lookup failed:",
        rateError.message,
      );

      return NextResponse.json(
        {
          error:
            "Could not load the current exchange rate.",
        },
        {
          status: 500,
        },
      );
    }

    if (!exchangeRateRow) {
      return NextResponse.json(
        {
          error:
            "No exchange rate is currently available.",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * Load the latest CAD transfer fee
     * for this business.
     */
    const {
      data: feeRow,
      error: feeError,
    } = await admin
      .from("business_fees")
      .select(
        "fee_amount, created_at",
      )
      .eq(
        "business_id",
        customer.business_id,
      )
      .eq(
        "currency",
        "CAD",
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      )
      .limit(1)
      .maybeSingle();

    if (feeError) {
      console.error(
        "Transaction fee lookup failed:",
        feeError.message,
      );

      return NextResponse.json(
        {
          error:
            "Could not load the current transfer fee.",
        },
        {
          status: 500,
        },
      );
    }

    if (!feeRow) {
      return NextResponse.json(
        {
          error:
            "No transfer fee is currently available.",
        },
        {
          status: 409,
        },
      );
    }

    const exchangeRate =
      Number(
        exchangeRateRow.rate,
      );

    const feeCad =
      roundMoney(
        Number(
          feeRow.fee_amount,
        ),
      );

    if (
      !Number.isFinite(
        exchangeRate,
      ) ||
      exchangeRate <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "The current exchange rate is invalid.",
        },
        {
          status: 500,
        },
      );
    }

    if (
      !Number.isFinite(feeCad) ||
      feeCad < 0
    ) {
      return NextResponse.json(
        {
          error:
            "The current transfer fee is invalid.",
        },
        {
          status: 500,
        },
      );
    }

    /*
     * Calculate all financial values
     * on the server.
     */
    const enteredAmount =
      roundMoney(
        sendAmountCad,
      );

    const amountToConvert =
      feeIncludedInAmount
        ? roundMoney(
            enteredAmount -
              feeCad,
          )
        : enteredAmount;

    if (amountToConvert <= 0) {
      return NextResponse.json(
        {
          error:
            "The send amount must be greater than the transfer fee.",
        },
        {
          status: 400,
        },
      );
    }

    const totalCustomerPays =
      feeIncludedInAmount
        ? enteredAmount
        : roundMoney(
            enteredAmount +
              feeCad,
          );

    const recipientAmount =
      roundMoney(
        amountToConvert *
          exchangeRate,
      );

    const feeTreatment =
      feeIncludedInAmount
        ? "deducted"
        : "added";

    /*
     * Create the real transaction.
     *
     * BusinessFlow does not move money.
     * The customer sends the Interac
     * e-Transfer outside BusinessFlow.
     */
    const {
      data: transaction,
      error: transactionError,
    } = await admin
      .from("transactions")
      .insert({
        business_id:
          customer.business_id,

        customer_id:
          customer.id,

        recipient_id:
          recipient.id,

        base_currency:
          "CAD",

        quote_currency:
          "ETB",

        send_amount:
          enteredAmount,

        fee_amount:
          feeCad,

        fee_treatment:
          feeTreatment,

        amount_to_convert:
          amountToConvert,

        total_customer_pays:
          totalCustomerPays,

        exchange_rate:
          exchangeRate,

        recipient_amount:
          recipientAmount,

        payment_method:
          "etransfer",

        payment_status:
          "awaiting_payment",

        transaction_status:
          "pending",
      })
      .select(
        "id, created_at, send_amount, fee_amount, fee_treatment, amount_to_convert, total_customer_pays, exchange_rate, recipient_amount, transaction_status",
      )
      .single();

    if (
      transactionError ||
      !transaction
    ) {
      console.error(
        "Transaction insert failed:",
        transactionError?.message,
      );

      return NextResponse.json(
        {
          error:
            "Could not create the transfer request.",
        },
        {
          status: 500,
        },
      );
    }

    const recipientName =
      makeRecipientName(
        recipient,
      );

    const customerName = [
      customer.first_name,
      customer.last_name,
    ]
      .filter(Boolean)
      .join(" ");

    /*
     * Return only safe recipient data.
     * Full account number is never returned.
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

            bankId:
              recipient.bank_id,

            sendingReason:
              recipient.sending_reason,

            accountLast4:
              recipient.account_last4,
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
        status: 201,
      },
    );
  } catch (err) {
    console.error(
      "Unexpected transaction API error:",
      err,
    );

    return NextResponse.json(
      {
        error:
          "An unexpected error occurred while creating the transfer request.",
      },
      {
        status: 500,
      },
    );
  }
}