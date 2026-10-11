import { findDemoBank, getDemoBanks } from "../banks";
import { DEMO_LATENCY_MS } from "../config";
import { recipientDisplayName } from "../format";
import {
  demoCustomer,
  demoRecipients,
  demoTransactions,
} from "../mock-data";
import {
  calculateQuote,
  validateSendAmount,
} from "../quote";

import {
  addSupabaseRecipient,
  archiveSupabaseRecipient,
  getSupabaseRecipient,
  listSupabaseRecipients,
} from "./supabase-recipient-service";

import type {
  Bank,
  Customer,
  NewRecipientInput,
  NotificationPreferences,
  ProfileUpdateInput,
  Recipient,
  RecipientSnapshot,
  Transaction,
  TransferRequestInput,
} from "../types";

/**
 * CustomerDataService - the only way pages/components read or write
 * customer data.
 *
 * Some parts are now connected to Supabase while transactions are
 * still simulated for the pilot.
 */
export interface CustomerDataService {
  getProfile(
    customerId: string,
  ): Promise<Customer | null>;

  updateProfile(
    customerId: string,
    input: ProfileUpdateInput,
  ): Promise<Customer>;

  updateNotificationPreferences(
    customerId: string,
    prefs: NotificationPreferences,
  ): Promise<Customer>;

  listBanks(): Promise<Bank[]>;

  listRecipients(
    customerId: string,
  ): Promise<Recipient[]>;

  getRecipient(
    customerId: string,
    recipientId: string,
  ): Promise<Recipient | null>;

  addRecipient(
    customerId: string,
    input: NewRecipientInput,
  ): Promise<Recipient>;

  removeRecipient(
    customerId: string,
    recipientId: string,
  ): Promise<void>;

  listTransactions(
    customerId: string,
  ): Promise<Transaction[]>;

  getTransaction(
    customerId: string,
    transactionId: string,
  ): Promise<Transaction | null>;

  /**
   * DEMO: creates a simulated transfer request with status "Pending".
   * No money moves.
   */
  createTransferRequest(
    customerId: string,
    input: TransferRequestInput,
  ): Promise<Transaction>;
}

/* ------------------------------------------------------------------------ */
/* Demo persistence                                                         */
/* ------------------------------------------------------------------------ */

/**
 * The demo store is still used for profile and simulated transactions.
 *
 * Recipients are no longer read from or written to this store by the
 * active recipient methods. They now use Supabase.
 */
const STORE_KEY =
  "businessflow.customerPortal.demoStore.v1";

interface DemoStore {
  customers: Customer[];
  recipients: Recipient[];
  transactions: Transaction[];
  nextReferenceNumber: number;
}

function seedStore(): DemoStore {
  return {
    customers: [
      structuredClone(demoCustomer),
    ],
    recipients:
      structuredClone(demoRecipients),
    transactions:
      structuredClone(demoTransactions),
    nextReferenceNumber: 260007,
  };
}

let memoryStore: DemoStore | null =
  null;

export function readDemoStore(): DemoStore {
  if (memoryStore) {
    return memoryStore;
  }

  let store: DemoStore | null = null;

  try {
    const raw =
      typeof window !== "undefined"
        ? window.localStorage.getItem(
            STORE_KEY,
          )
        : null;

    if (raw) {
      store = JSON.parse(
        raw,
      ) as DemoStore;
    }
  } catch {
    store = null;
  }

  memoryStore =
    store &&
    Array.isArray(store.customers)
      ? store
      : seedStore();

  return memoryStore;
}

export function writeDemoStore(
  store: DemoStore,
): void {
  memoryStore = store;

  try {
    window.localStorage.setItem(
      STORE_KEY,
      JSON.stringify(store),
    );
  } catch {
    // Storage may be unavailable.
    // The demo continues working in memory.
  }
}

export function resetDemoStore(): void {
  writeDemoStore(seedStore());
}

export function delay(
  ms: number = DEMO_LATENCY_MS,
): Promise<void> {
  return new Promise((resolve) =>
    setTimeout(resolve, ms),
  );
}

function newId(
  prefix: string,
): string {
  const random =
    typeof crypto !== "undefined" &&
    "randomUUID" in crypto
      ? crypto
          .randomUUID()
          .slice(0, 8)
      : Math.random()
          .toString(36)
          .slice(2, 10);

  return `${prefix}-${random}`;
}

function requireCustomer(
  store: DemoStore,
  customerId: string,
): Customer {
  const customer =
    store.customers.find(
      (c) => c.id === customerId,
    );

  if (!customer) {
    throw new Error(
      "Your demo session has expired. Please sign in again.",
    );
  }

  return customer;
}

/* ------------------------------------------------------------------------ */
/* Customer data implementation                                             */
/* ------------------------------------------------------------------------ */

export const demoCustomerDataService: CustomerDataService =
  {
    /* -------------------------------------------------------------------- */
    /* Profile - still demo                                                 */
    /* -------------------------------------------------------------------- */

    async getProfile(customerId) {
      await delay(150);

      return (
        readDemoStore().customers.find(
          (c) =>
            c.id === customerId,
        ) ?? null
      );
    },

    async updateProfile(
      customerId,
      input,
    ) {
      await delay();

      const store =
        readDemoStore();

      const customer =
        requireCustomer(
          store,
          customerId,
        );

      const emailTaken =
        store.customers.some(
          (c) =>
            c.id !== customerId &&
            c.email.toLowerCase() ===
              input.email
                .trim()
                .toLowerCase(),
        );

      if (emailTaken) {
        throw new Error(
          "Another demo account already uses that email.",
        );
      }

      const updated: Customer = {
        ...customer,
        firstName:
          input.firstName.trim(),
        lastName:
          input.lastName.trim(),
        email:
          input.email.trim(),
        phone:
          input.phone.trim(),
      };

      writeDemoStore({
        ...store,
        customers:
          store.customers.map(
            (c) =>
              c.id === customerId
                ? updated
                : c,
          ),
      });

      return updated;
    },

    async updateNotificationPreferences(
      customerId,
      prefs,
    ) {
      await delay(250);

      const store =
        readDemoStore();

      const customer =
        requireCustomer(
          store,
          customerId,
        );

      const updated: Customer = {
        ...customer,
        notificationPreferences: {
          ...prefs,
        },
      };

      writeDemoStore({
        ...store,
        customers:
          store.customers.map(
            (c) =>
              c.id === customerId
                ? updated
                : c,
          ),
      });

      return updated;
    },

    /* -------------------------------------------------------------------- */
    /* Banks                                                                */
    /* -------------------------------------------------------------------- */

    async listBanks() {
      await delay(100);

      return getDemoBanks();
    },

    /* -------------------------------------------------------------------- */
    /* Recipients - REAL SUPABASE DATA                                      */
    /* -------------------------------------------------------------------- */

    async listRecipients(
      _customerId,
    ) {
      return listSupabaseRecipients();
    },

    async getRecipient(
      _customerId,
      recipientId,
    ) {
      return getSupabaseRecipient(
        recipientId,
      );
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

    /* -------------------------------------------------------------------- */
    /* Transactions - still simulated                                       */
    /* -------------------------------------------------------------------- */

    async listTransactions(
      customerId,
    ) {
      await delay();

      return readDemoStore()
        .transactions.filter(
          (t) =>
            t.customerId ===
            customerId,
        )
        .sort((a, b) =>
          b.createdAt.localeCompare(
            a.createdAt,
          ),
        );
    },

    async getTransaction(
      customerId,
      transactionId,
    ) {
      await delay(250);

      return (
        readDemoStore().transactions.find(
          (t) =>
            t.customerId ===
              customerId &&
            t.id ===
              transactionId,
        ) ?? null
      );
    },

    async createTransferRequest(
      customerId,
      input,
    ) {
      await delay(900);

      const store =
        readDemoStore();

      const customer =
        requireCustomer(
          store,
          customerId,
        );

      /*
       * The recipient now comes from Supabase.
       */
      const recipient =
        await getSupabaseRecipient(
          input.recipientId,
        );

      if (!recipient) {
        throw new Error(
          "The selected recipient could not be found.",
        );
      }

      /*
       * Validate using the business fee
       * and the customer's fee choice.
       */
      const amountError =
        validateSendAmount(
          input.sendAmountCad,
          input.feeCad,
          input.feeIncludedInAmount,
        );

      if (amountError) {
        throw new Error(
          amountError,
        );
      }

      if (
        !Number.isFinite(
          input.exchangeRate,
        ) ||
        input.exchangeRate <= 0
      ) {
        throw new Error(
          "The exchange rate is invalid.",
        );
      }

      if (
        !Number.isFinite(
          input.feeCad,
        ) ||
        input.feeCad < 0
      ) {
        throw new Error(
          "The transfer fee is invalid.",
        );
      }

      /*
       * DEMO TRANSACTION ONLY:
       *
       * This preserves the exact quote
       * the customer reviewed.
       *
       * PRODUCTION:
       * The server must independently
       * retrieve the business rate and
       * fee and create an immutable
       * transaction snapshot.
       */
      const quote =
        calculateQuote(
          input.sendAmountCad,
          input.deliverySpeed,
          input.exchangeRate,
          input.feeCad,
          input.feeIncludedInAmount,
        );

      const bank =
        findDemoBank(
          recipient.bankId,
        );

      const snapshot: RecipientSnapshot =
        {
          recipientId:
            recipient.id,

          displayName:
            recipientDisplayName(
              recipient,
            ),

          bankName:
            bank?.name ??
            "Unknown bank",

          accountLast4:
            recipient.accountLast4,

          phone:
            recipient.phone,

          sendingReason:
            recipient.sendingReason,
        };

      const referenceNumber =
        store.nextReferenceNumber;

      const transaction: Transaction =
        {
          id: newId(
            "demo-txn",
          ),

          reference:
            `DEMO-BF-${referenceNumber}`,

          createdAt:
            new Date().toISOString(),

          status: "Pending",

          customerId,

          customerName:
            `${customer.firstName} ${customer.lastName}`,

          recipient:
            snapshot,

          sendAmountCad:
            quote.sendAmountCad,

          amountConvertedCad:
            quote.amountConvertedCad,

          exchangeRate:
            quote.exchangeRate,

          feeCad:
            quote.feeCad,

          feeIncludedInAmount:
            quote.feeIncludedInAmount,

          totalCad:
            quote.totalCad,

          receiveAmountEtb:
            quote.receiveAmountEtb,

          deliverySpeed:
            quote.deliverySpeed,

          isDemo: true,
        };

      writeDemoStore({
        ...store,

        transactions: [
          transaction,
          ...store.transactions,
        ],

        nextReferenceNumber:
          referenceNumber + 1,
      });

      return transaction;
    },
  };

/**
 * Active customer data service.
 *
 * Recipients:
 *   Supabase
 *
 * Profile:
 *   Demo/local
 *
 * Transactions:
 *   Demo/local
 */
export const customerData: CustomerDataService =
  demoCustomerDataService;