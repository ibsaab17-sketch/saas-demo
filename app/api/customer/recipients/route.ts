import { NextResponse } from "next/server";

import { encryptRecipientAccountNumber } from "@/app/customer/_lib/server/recipient-encryption";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

interface CreateRecipientBody {
  type?: "individual" | "business";
  firstName?: string;
  middleName?: string;
  lastName?: string;
  businessName?: string;
  phone?: string;
  bankId?: string;
  accountNumber?: string;
  sendingReason?: string;
}

interface SafeRecipientRow {
  id: string;
  customer_id: string;
  recipient_type: "individual" | "business";
  first_name: string;
  middle_name: string | null;
  last_name: string;
  business_name: string | null;
  phone: string;
  bank_id: string;
  account_last4: string | null;
  sending_reason: string | null;
  status: "active" | "archived";
  created_at: string;
}

const SAFE_RECIPIENT_FIELDS = `
  id,
  customer_id,
  recipient_type,
  first_name,
  middle_name,
  last_name,
  business_name,
  phone,
  bank_id,
  account_last4,
  sending_reason,
  status,
  created_at
`;

function mapRecipient(
  recipient: SafeRecipientRow,
) {
  return {
    id: recipient.id,
    customerId: recipient.customer_id,
    type: recipient.recipient_type,
    firstName: recipient.first_name,
    middleName:
      recipient.middle_name ?? undefined,
    lastName: recipient.last_name,
    businessName:
      recipient.business_name ?? undefined,
    phone: recipient.phone,
    bankId: recipient.bank_id,
    accountLast4:
      recipient.account_last4 ?? "",
    sendingReason:
      recipient.sending_reason ?? "",
    createdAt: recipient.created_at,
    
  };
}

/**
 * Verify the signed-in user and resolve the
 * customer's ID and business ID.
 *
 * IMPORTANT:
 * Authentication still uses the normal
 * cookie-based Supabase client.
 *
 * The admin client is NOT used to determine
 * who the user is.
 */
async function getAuthenticatedCustomer() {
  const supabase = await createClient();

  const {
    data: authData,
    error: authError,
  } = await supabase.auth.getUser();

  if (
    authError ||
    !authData.user
  ) {
    return {
      customer: null,
      error: "You must be signed in.",
      status: 401,
    };
  }

  const {
    data: customer,
    error: customerError,
  } = await supabase
    .from("customers")
    .select("id, business_id")
    .eq(
      "user_id",
      authData.user.id,
    )
    .eq("status", "active")
    .maybeSingle();

  if (customerError) {
    return {
      customer: null,
      error: customerError.message,
      status: 400,
    };
  }

  if (!customer) {
    return {
      customer: null,
      error:
        "No active customer profile was found.",
      status: 403,
    };
  }

  return {
    customer: {
      id: customer.id as string,
      businessId:
        customer.business_id as string,
    },
    error: null,
    status: 200,
  };
}

/**
 * GET /api/customer/recipients
 *
 * Return only safe recipient information.
 *
 * The authenticated user's customer/business
 * identity is established BEFORE the admin
 * database client is used.
 *
 * account_number_encrypted is never selected.
 */
export async function GET() {
  try {
    const {
      customer,
      error,
      status,
    } = await getAuthenticatedCustomer();

    if (
      error ||
      !customer
    ) {
      return NextResponse.json(
        {
          error:
            error ??
            "Customer could not be verified.",
        },
        { status },
      );
    }

    /*
     * The admin client is server-only.
     *
     * Because it bypasses normal RLS protections,
     * every query MUST explicitly constrain both
     * customer_id and business_id.
     */
    const admin =
      createAdminClient();

    const {
      data: recipients,
      error: recipientsError,
    } = await admin
      .from("recipients")
      .select(SAFE_RECIPIENT_FIELDS)
      .eq(
        "customer_id",
        customer.id,
      )
      .eq(
        "business_id",
        customer.businessId,
      )
      .eq("status", "active")
      .order("created_at", {
        ascending: false,
      });

    if (recipientsError) {
      console.error(
        "List recipients database error:",
        recipientsError,
      );

      return NextResponse.json(
        {
          error:
            "Recipients could not be loaded.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      recipients: (
        (recipients ?? []) as SafeRecipientRow[]
      ).map(mapRecipient),
    });
  } catch (error) {
    console.error(
      "List recipients failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Recipients could not be loaded.",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/customer/recipients
 *
 * Create a recipient with server-side
 * account-number encryption.
 */
export async function POST(
  request: Request,
) {
  try {
    const {
      customer,
      error,
      status,
    } = await getAuthenticatedCustomer();

    if (
      error ||
      !customer
    ) {
      return NextResponse.json(
        {
          error:
            error ??
            "Customer could not be verified.",
        },
        { status },
      );
    }

    const body =
      (await request.json()) as CreateRecipientBody;

    const recipientType =
      body.type === "business"
        ? "business"
        : "individual";

    const firstName =
      body.firstName?.trim() ?? "";

    const middleName =
      body.middleName?.trim() || null;

    const lastName =
      body.lastName?.trim() ?? "";

    const businessName =
      body.businessName?.trim() || null;

    const phone =
      body.phone?.trim() ?? "";

    const bankId =
      body.bankId?.trim() ?? "";

    const sendingReason =
      body.sendingReason?.trim() || null;

    /*
     * Normalize the bank account number before
     * validation and encryption.
     */
    const accountNumber =
      body.accountNumber?.replace(
        /\D/g,
        "",
      ) ?? "";

    if (!firstName) {
      return NextResponse.json(
        {
          error:
            "Recipient first name is required.",
        },
        { status: 400 },
      );
    }

    if (!lastName) {
      return NextResponse.json(
        {
          error:
            "Recipient last name is required.",
        },
        { status: 400 },
      );
    }

    if (!phone) {
      return NextResponse.json(
        {
          error:
            "Recipient phone number is required.",
        },
        { status: 400 },
      );
    }

    if (!bankId) {
      return NextResponse.json(
        {
          error:
            "Recipient bank is required.",
        },
        { status: 400 },
      );
    }

    if (
      accountNumber.length < 8 ||
      accountNumber.length > 16
    ) {
      return NextResponse.json(
        {
          error:
            "Bank account number must contain 8 to 16 digits.",
        },
        { status: 400 },
      );
    }

    if (
      recipientType === "business" &&
      !businessName
    ) {
      return NextResponse.json(
        {
          error:
            "Business name is required.",
        },
        { status: 400 },
      );
    }

    /*
     * Encrypt the full bank account number.
     *
     * Only the server can access the encryption
     * key.
     */
    const encryptedAccountNumber =
      encryptRecipientAccountNumber(
        accountNumber,
      );

    const accountLast4 =
      accountNumber.slice(-4);

    /*
     * Use the server-only admin client only AFTER
     * authentication and customer/business
     * resolution have succeeded.
     */
    const admin =
      createAdminClient();

    const {
      data: recipient,
      error: insertError,
    } = await admin
      .from("recipients")
      .insert({
        business_id:
          customer.businessId,

        customer_id:
          customer.id,

        recipient_type:
          recipientType,

        first_name:
          firstName,

        middle_name:
          middleName,

        last_name:
          lastName,

        business_name:
          recipientType === "business"
            ? businessName
            : null,

        phone,

        bank_id:
          bankId,

        account_number_encrypted:
          encryptedAccountNumber,

        account_last4:
          accountLast4,

        sending_reason:
          sendingReason,

        status:
          "active",
      })
      .select(SAFE_RECIPIENT_FIELDS)
      .single();

    if (insertError) {
      console.error(
        "Create recipient database error:",
        insertError,
      );

      return NextResponse.json(
        {
          error:
            "The recipient could not be created.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        recipient: mapRecipient(
          recipient as SafeRecipientRow,
        ),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "Create recipient failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "The recipient could not be created.",
      },
      { status: 500 },
    );
  }
}