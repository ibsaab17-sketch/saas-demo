import { NextRequest, NextResponse } from "next/server";
import {
  PDFDocument,
  StandardFonts,
  rgb,
} from "pdf-lib";

import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

function money(value: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
  }).format(value);
}

function etb(value: number) {
  return `${new Intl.NumberFormat("en-CA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} ETB`;
}

function friendlyBankName(bankId: string | null) {
  const banks: Record<string, string> = {
    "demo-cbe": "Commercial Bank of Ethiopia",
    "demo-awash": "Awash Bank",
    "demo-dashen": "Dashen Bank",
    "demo-boa": "Bank of Abyssinia",
    "demo-coop": "Cooperative Bank of Oromia",
  };

  if (!bankId) {
    return "Not provided";
  }

  return banks[bankId] ?? bankId;
}

function recipientName(recipient: {
  recipient_type: string | null;
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

  const name = [
    recipient.first_name,
    recipient.middle_name,
    recipient.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || recipient.business_name || "Recipient";
}

function customerName(customer: {
  first_name: string | null;
  last_name: string | null;
}) {
  const name = [
    customer.first_name,
    customer.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || "Customer";
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          error: "Transaction ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error: "You must be signed in.",
        },
        {
          status: 401,
        },
      );
    }

    const admin = createAdminClient();

    const {
      data: customer,
      error: customerError,
    } = await admin
      .from("customers")
      .select(
        `
          id,
          business_id,
          first_name,
          last_name,
          email,
          status
        `,
      )
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (customerError) {
      console.error(
        "Receipt customer lookup failed:",
        customerError,
      );

      return NextResponse.json(
        {
          error: "Could not verify your customer account.",
        },
        {
          status: 500,
        },
      );
    }

    if (!customer) {
      return NextResponse.json(
        {
          error: "Customer account was not found.",
        },
        {
          status: 403,
        },
      );
    }

    const {
      data: transaction,
      error: transactionError,
    } = await admin
      .from("transactions")
      .select(
        `
          id,
          business_id,
          customer_id,
          recipient_id,
          base_currency,
          quote_currency,
          send_amount,
          fee_amount,
          fee_treatment,
          amount_to_convert,
          total_customer_pays,
          exchange_rate,
          recipient_amount,
          payment_status,
          transaction_status,
          created_at,
          completed_at
        `,
      )
      .eq("id", id)
      .eq("customer_id", customer.id)
      .eq("business_id", customer.business_id)
      .maybeSingle();

    if (transactionError) {
      console.error(
        "Receipt transaction lookup failed:",
        transactionError,
      );

      return NextResponse.json(
        {
          error: "Could not load the transaction.",
        },
        {
          status: 500,
        },
      );
    }

    if (!transaction) {
      return NextResponse.json(
        {
          error: "Transaction not found.",
        },
        {
          status: 404,
        },
      );
    }

    const {
      data: recipient,
      error: recipientError,
    } = await admin
      .from("recipients")
      .select(
        `
          id,
          business_id,
          customer_id,
          recipient_type,
          first_name,
          middle_name,
          last_name,
          business_name,
          phone,
          bank_id,
          sending_reason,
          account_last4
        `,
      )
      .eq("id", transaction.recipient_id)
      .eq("customer_id", customer.id)
      .eq("business_id", customer.business_id)
      .maybeSingle();

    if (recipientError) {
      console.error(
        "Receipt recipient lookup failed:",
        recipientError,
      );

      return NextResponse.json(
        {
          error: "Could not load the recipient.",
        },
        {
          status: 500,
        },
      );
    }

    if (!recipient) {
      return NextResponse.json(
        {
          error: "Recipient not found.",
        },
        {
          status: 404,
        },
      );
    }

    const reference = transaction.id
      .replace(/-/g, "")
      .slice(0, 10)
      .toUpperCase();

    const pdf = await PDFDocument.create();

    const page = pdf.addPage([612, 792]);

    const regular =
      await pdf.embedFont(
        StandardFonts.Helvetica,
      );

    const bold =
      await pdf.embedFont(
        StandardFonts.HelveticaBold,
      );

    const dark = rgb(
      15 / 255,
      23 / 255,
      42 / 255,
    );

    const muted = rgb(
      100 / 255,
      116 / 255,
      139 / 255,
    );

    const line = rgb(
      226 / 255,
      232 / 255,
      240 / 255,
    );

    let y = 735;

    page.drawText("BusinessFlow", {
      x: 50,
      y,
      size: 22,
      font: bold,
      color: dark,
    });

    page.drawText("Transfer Receipt", {
      x: 50,
      y: y - 24,
      size: 11,
      font: regular,
      color: muted,
    });

    const status =
      transaction.transaction_status
        .toUpperCase();

    page.drawText(status, {
      x: 450,
      y,
      size: 11,
      font: bold,
      color: dark,
    });

    y -= 55;

    page.drawLine({
      start: {
        x: 50,
        y,
      },
      end: {
        x: 562,
        y,
      },
      thickness: 1,
      color: line,
    });

    y -= 35;

    function heading(text: string) {
      page.drawText(text, {
        x: 50,
        y,
        size: 11,
        font: bold,
        color: muted,
      });

      y -= 24;
    }

    function row(
      label: string,
      value: string,
    ) {
      page.drawText(label, {
        x: 50,
        y,
        size: 10,
        font: regular,
        color: muted,
      });

      page.drawText(value, {
        x: 250,
        y,
        size: 10,
        font: bold,
        color: dark,
      });

      y -= 23;
    }

    heading("TRANSFER DETAILS");

    row(
      "Reference number",
      reference,
    );

    row(
      "Date",
      formatDate(
        transaction.created_at,
      ),
    );

    row(
      "Customer",
      customerName(customer),
    );

    row(
      "Status",
      transaction.transaction_status,
    );

    y -= 15;

    heading("RECIPIENT");

    row(
      "Recipient",
      recipientName(recipient),
    );

    row(
      "Destination bank",
      friendlyBankName(
        recipient.bank_id,
      ),
    );

    row(
      "Account number",
      recipient.account_last4
        ? `**** ${recipient.account_last4}`
        : "Not provided",
    );

    row(
      "Sending reason",
      recipient.sending_reason ??
        "Not provided",
    );

    y -= 15;

    heading("AMOUNTS");

    row(
      "CAD sent",
      money(
        Number(
          transaction.send_amount,
        ),
      ),
    );

    row(
      "Exchange rate",
      `1 CAD = ${Number(
        transaction.exchange_rate,
      ).toFixed(2)} ETB`,
    );

    row(
      "Transfer fee",
      money(
        Number(
          transaction.fee_amount,
        ),
      ),
    );

    row(
      "Amount converted",
      money(
        Number(
          transaction.amount_to_convert,
        ),
      ),
    );

    row(
      "Total paid",
      money(
        Number(
          transaction.total_customer_pays,
        ),
      ),
    );

    row(
      "Recipient receives",
      etb(
        Number(
          transaction.recipient_amount,
        ),
      ),
    );

    y -= 20;

    page.drawLine({
      start: {
        x: 50,
        y,
      },
      end: {
        x: 562,
        y,
      },
      thickness: 1,
      color: line,
    });

    y -= 28;

    page.drawText(
      "Keep this receipt for your records.",
      {
        x: 50,
        y,
        size: 9,
        font: regular,
        color: muted,
      },
    );

    y -= 17;

    page.drawText(
      "BusinessFlow records the transfer workflow. The actual payment and transfer are completed outside the application.",
      {
        x: 50,
        y,
        size: 8,
        font: regular,
        color: muted,
        maxWidth: 500,
        lineHeight: 11,
      },
    );

    const pdfBytes =
      await pdf.save();

    return new NextResponse(
      Buffer.from(pdfBytes),
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/pdf",
          "Content-Disposition":
            `attachment; filename="BusinessFlow-${reference}.pdf"`,
          "Cache-Control":
            "private, no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "Receipt PDF generation failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Could not generate the receipt.",
      },
      {
        status: 500,
      },
    );
  }
}
