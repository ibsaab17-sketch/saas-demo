import type {
  Transaction,
} from "../types";

export interface CreateSupabaseTransactionInput {
  recipientId: string;
  sendAmountCad: number;
  feeIncludedInAmount: boolean;
}

interface CreateTransactionResponse {
  transaction?: Transaction;
  error?: string;
}

/*
 * Creates a real transaction workflow
 * record through our protected server API.
 *
 * Important:
 * The browser sends only values the
 * customer is allowed to control.
 *
 * The server independently determines:
 * - customer
 * - business
 * - exchange rate
 * - transfer fee
 * - amount converted
 * - recipient amount
 * - payment status
 * - transaction status
 */
export async function createSupabaseTransaction(
  input: CreateSupabaseTransactionInput,
): Promise<Transaction> {
  const response = await fetch(
    "/api/customer/transactions",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        recipientId:
          input.recipientId,

        sendAmountCad:
          input.sendAmountCad,

        feeIncludedInAmount:
          input.feeIncludedInAmount,
      }),
    },
  );

  let result: CreateTransactionResponse;

  try {
    result =
      (await response.json()) as CreateTransactionResponse;
  } catch {
    throw new Error(
      "The server returned an invalid response.",
    );
  }

  if (!response.ok) {
    throw new Error(
      result.error ??
        "Could not create the transfer request.",
    );
  }

  if (!result.transaction) {
    throw new Error(
      "The transaction was not returned by the server.",
    );
  }

  return result.transaction;
}