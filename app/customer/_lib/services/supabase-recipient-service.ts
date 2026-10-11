import type {
  NewRecipientInput,
  Recipient,
} from "../types";

interface RecipientsResponse {
  recipients?: Recipient[];
  error?: string;
}

interface RecipientResponse {
  recipient?: Recipient;
  error?: string;
}

interface ArchiveRecipientResponse {
  success?: boolean;
  recipientId?: string;
  error?: string;
}

/**
 * Safely parse JSON returned by our
 * server-side recipient API.
 */
async function parseJsonResponse<T>(
  response: Response,
): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error(
      "The server returned an invalid response.",
    );
  }
}

/**
 * Return all active recipients belonging to
 * the currently signed-in customer.
 *
 * The browser does NOT query the recipients
 * database table directly.
 *
 * The server API returns only safe fields.
 */
export async function listSupabaseRecipients(): Promise<
  Recipient[]
> {
  const response = await fetch(
    "/api/customer/recipients",
    {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    },
  );

  const result =
    await parseJsonResponse<RecipientsResponse>(
      response,
    );

  if (!response.ok) {
    throw new Error(
      result.error ||
        "Recipients could not be loaded.",
    );
  }

  return result.recipients ?? [];
}

/**
 * Return one active recipient belonging to
 * the currently signed-in customer.
 *
 * The safe recipient list is retrieved from
 * our server API and searched locally.
 *
 * No encrypted account number is returned
 * to the browser.
 */
export async function getSupabaseRecipient(
  recipientId: string,
): Promise<Recipient | null> {
  const recipients =
    await listSupabaseRecipients();

  return (
    recipients.find(
      (recipient) =>
        recipient.id === recipientId,
    ) ?? null
  );
}

/**
 * Add a new recipient.
 *
 * The full submitted bank account number is
 * sent to our authenticated server endpoint.
 *
 * Encryption happens on the server.
 *
 * The browser never receives:
 * - the encryption key
 * - encrypted ciphertext
 * - the stored full account number
 */
export async function addSupabaseRecipient(
  input: NewRecipientInput,
): Promise<Recipient> {
  const response = await fetch(
    "/api/customer/recipients",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify({
        type:
          input.type,

        firstName:
          input.firstName,

        middleName:
          input.middleName,

        lastName:
          input.lastName,

        businessName:
          input.businessName,

        phone:
          input.phone,

        bankId:
          input.bankId,

        accountNumber:
          input.accountNumber,

        sendingReason:
          input.sendingReason,
      }),
    },
  );

  const result =
    await parseJsonResponse<RecipientResponse>(
      response,
    );

  if (!response.ok) {
    throw new Error(
      result.error ||
        "The recipient could not be created.",
    );
  }

  if (!result.recipient) {
    throw new Error(
      "The server did not return the new recipient.",
    );
  }

  return result.recipient;
}

/**
 * Archive a recipient.
 *
 * This does NOT permanently delete the recipient.
 *
 * The browser sends only the recipient ID to our
 * authenticated server endpoint.
 *
 * The server determines the signed-in customer's
 * customer_id and business_id and archives only
 * a recipient belonging to that customer.
 */
export async function archiveSupabaseRecipient(
  recipientId: string,
): Promise<void> {
  if (!recipientId) {
    throw new Error(
      "Recipient ID is required.",
    );
  }

  const response = await fetch(
    `/api/customer/recipients/${encodeURIComponent(
      recipientId,
    )}`,
    {
      method: "DELETE",
      credentials: "same-origin",
    },
  );

  const result =
    await parseJsonResponse<ArchiveRecipientResponse>(
      response,
    );

  if (!response.ok) {
    throw new Error(
      result.error ||
        "The recipient could not be removed.",
    );
  }

  if (!result.success) {
    throw new Error(
      "The server did not confirm that the recipient was removed.",
    );
  }
}