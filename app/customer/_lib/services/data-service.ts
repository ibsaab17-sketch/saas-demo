import { getBanks } from "../banks";

import {
  addSupabaseRecipient,
  archiveSupabaseRecipient,
  listSupabaseRecipients,
} from "./supabase-recipient-service";

import type {
  Bank,
  NewRecipientInput,
  Recipient,
} from "../types";

/**
 * Customer data used by the active customer portal.
 *
 * Recipients are stored in Supabase.
 * Banks currently come from the local bank reference list.
 */
export interface CustomerDataService {
  listBanks(): Promise<Bank[]>;

  listRecipients(
    customerId: string,
  ): Promise<Recipient[]>;

  addRecipient(
    customerId: string,
    input: NewRecipientInput,
  ): Promise<Recipient>;

  removeRecipient(
    customerId: string,
    recipientId: string,
  ): Promise<void>;
}

export const customerData: CustomerDataService = {
  async listBanks() {
    return getBanks();
  },

  async listRecipients(
    _customerId,
  ) {
    return listSupabaseRecipients();
  },

  async addRecipient(
    _customerId,
    input,
  ) {
    return addSupabaseRecipient(
      input,
    );
  },

  async removeRecipient(
    _customerId,
    recipientId,
  ) {
    await archiveSupabaseRecipient(
      recipientId,
    );
  },
};