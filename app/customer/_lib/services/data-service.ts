import { findDemoBank, getDemoBanks } from "../banks";
import { DEMO_LATENCY_MS } from "../config";
import { recipientDisplayName } from "../format";
import { demoCustomer, demoRecipients, demoTransactions } from "../mock-data";
import { calculateQuote, validateSendAmount } from "../quote";
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
 * CustomerDataService — the only way pages/components read or write
 * customer data.
 *
 * PRODUCTION: implement this interface with Supabase (PostgreSQL + Row Level
 * Security) and/or server actions. Every method is already async so callers
 * handle loading and error states the same way they will with a real backend.
 */
export interface CustomerDataService {
  getProfile(customerId: string): Promise<Customer | null>;
  updateProfile(customerId: string, input: ProfileUpdateInput): Promise<Customer>;
  updateNotificationPreferences(
    customerId: string,
    prefs: NotificationPreferences,
  ): Promise<Customer>;

  listBanks(): Promise<Bank[]>;

  listRecipients(customerId: string): Promise<Recipient[]>;
  getRecipient(customerId: string, recipientId: string): Promise<Recipient | null>;
  addRecipient(customerId: string, input: NewRecipientInput): Promise<Recipient>;
  removeRecipient(customerId: string, recipientId: string): Promise<void>;

  listTransactions(customerId: string): Promise<Transaction[]>;
  getTransaction(customerId: string, transactionId: string): Promise<Transaction | null>;
  /** DEMO: creates a simulated transfer request with status "Pending". No money moves. */
  createTransferRequest(customerId: string, input: TransferRequestInput): Promise<Transaction>;
}

/* ------------------------------------------------------------------------ */
/* Demo persistence                                                          */
/* ------------------------------------------------------------------------ */

/**
 * The demo store lives in this browser's localStorage so the demo feels
 * persistent across page loads.
 *
 * SECURITY: nothing sensitive is written here — no passwords and no full
 * bank account numbers (recipients keep only the last 4 digits).
 */
const STORE_KEY = "businessflow.customerPortal.demoStore.v1";

interface DemoStore {
  customers: Customer[];
  recipients: Recipient[];
  transactions: Transaction[];
  nextReferenceNumber: number;
}

function seedStore(): DemoStore {
  return {
    customers: [structuredClone(demoCustomer)],
    recipients: structuredClone(demoRecipients),
    transactions: structuredClone(demoTransactions),
    nextReferenceNumber: 260007,
  };
}

let memoryStore: DemoStore | null = null;

export function readDemoStore(): DemoStore {
  if (memoryStore) return memoryStore;
  let store: DemoStore | null = null;
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORE_KEY) : null;
    if (raw) store = JSON.parse(raw) as DemoStore;
  } catch {
    store = null;
  }
  memoryStore = store && Array.isArray(store.customers) ? store : seedStore();
  return memoryStore;
}

export function writeDemoStore(store: DemoStore): void {
  memoryStore = store;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    // Storage may be unavailable (private mode). The demo keeps working in memory.
  }
}

/** Restores the original synthetic fixtures. */
export function resetDemoStore(): void {
  writeDemoStore(seedStore());
}

export function delay(ms: number = DEMO_LATENCY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function newId(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${random}`;
}

function requireCustomer(store: DemoStore, customerId: string): Customer {
  const customer = store.customers.find((c) => c.id === customerId);
  if (!customer) throw new Error("Your demo session has expired. Please sign in again.");
  return customer;
}

/* ------------------------------------------------------------------------ */
/* Demo implementation                                                       */
/* ------------------------------------------------------------------------ */

export const demoCustomerDataService: CustomerDataService = {
  async getProfile(customerId) {
    await delay(150);
    return readDemoStore().customers.find((c) => c.id === customerId) ?? null;
  },

  async updateProfile(customerId, input) {
    await delay();
    const store = readDemoStore();
    const customer = requireCustomer(store, customerId);
    const emailTaken = store.customers.some(
      (c) => c.id !== customerId && c.email.toLowerCase() === input.email.trim().toLowerCase(),
    );
    if (emailTaken) throw new Error("Another demo account already uses that email.");
    const updated: Customer = {
      ...customer,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: input.email.trim(),
      phone: input.phone.trim(),
    };
    writeDemoStore({
      ...store,
      customers: store.customers.map((c) => (c.id === customerId ? updated : c)),
    });
    return updated;
  },

  async updateNotificationPreferences(customerId, prefs) {
    await delay(250);
    const store = readDemoStore();
    const customer = requireCustomer(store, customerId);
    const updated: Customer = { ...customer, notificationPreferences: { ...prefs } };
    writeDemoStore({
      ...store,
      customers: store.customers.map((c) => (c.id === customerId ? updated : c)),
    });
    return updated;
  },

  async listBanks() {
    await delay(100);
    return getDemoBanks();
  },

  async listRecipients(customerId) {
    await delay();
    return readDemoStore()
      .recipients.filter((r) => r.customerId === customerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getRecipient(customerId, recipientId) {
    await delay(150);
    return (
      readDemoStore().recipients.find((r) => r.customerId === customerId && r.id === recipientId) ??
      null
    );
  },

  async addRecipient(customerId, input) {
    await delay();
    const store = readDemoStore();
    requireCustomer(store, customerId);
    if (!findDemoBank(input.bankId)) throw new Error("Please choose a bank from the list.");
    const digits = input.accountNumber.replace(/\D/g, "");
    const recipient: Recipient = {
      id: newId("demo-rcp"),
      customerId,
      type: input.type,
      firstName: input.firstName.trim(),
      middleName: input.middleName?.trim() || undefined,
      lastName: input.lastName.trim(),
      businessName: input.type === "business" ? input.businessName?.trim() : undefined,
      phone: input.phone.trim(),
      sendingReason: input.sendingReason,
      bankId: input.bankId,
      // SECURITY: only the last 4 digits are kept. The full number is discarded here.
      accountLast4: digits.slice(-4),
      createdAt: new Date().toISOString(),
      isDemo: true,
    };
    writeDemoStore({ ...store, recipients: [recipient, ...store.recipients] });
    return recipient;
  },

  async removeRecipient(customerId, recipientId) {
    await delay();
    const store = readDemoStore();
    writeDemoStore({
      ...store,
      recipients: store.recipients.filter(
        (r) => !(r.customerId === customerId && r.id === recipientId),
      ),
    });
  },

  async listTransactions(customerId) {
    await delay();
    return readDemoStore()
      .transactions.filter((t) => t.customerId === customerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getTransaction(customerId, transactionId) {
    await delay(250);
    return (
      readDemoStore().transactions.find(
        (t) => t.customerId === customerId && t.id === transactionId,
      ) ?? null
    );
  },

  async createTransferRequest(customerId, input) {
    await delay(900);
    const store = readDemoStore();
    const customer = requireCustomer(store, customerId);
    const recipient = store.recipients.find(
      (r) => r.customerId === customerId && r.id === input.recipientId,
    );
    if (!recipient) throw new Error("The selected recipient could not be found.");
    const amountError = validateSendAmount(input.sendAmountCad);
    if (amountError) throw new Error(amountError);

    // PRODUCTION: the server recomputes the quote from its own rate/fee source.
    const quote = calculateQuote(input.sendAmountCad, input.deliverySpeed);
    const bank = findDemoBank(recipient.bankId);
    const snapshot: RecipientSnapshot = {
      recipientId: recipient.id,
      displayName: recipientDisplayName(recipient),
      bankName: bank?.name ?? "Unknown bank",
      accountLast4: recipient.accountLast4,
      phone: recipient.phone,
      sendingReason: recipient.sendingReason,
    };
    const referenceNumber = store.nextReferenceNumber;
    const transaction: Transaction = {
      id: newId("demo-txn"),
      reference: `DEMO-BF-${referenceNumber}`,
      createdAt: new Date().toISOString(),
      status: "Pending",
      customerId,
      customerName: `${customer.firstName} ${customer.lastName}`,
      recipient: snapshot,
      sendAmountCad: quote.sendAmountCad,
      exchangeRate: quote.exchangeRate,
      feeCad: quote.feeCad,
      totalCad: quote.totalCad,
      receiveAmountEtb: quote.receiveAmountEtb,
      deliverySpeed: quote.deliverySpeed,
      isDemo: true,
    };
    writeDemoStore({
      ...store,
      transactions: [transaction, ...store.transactions],
      nextReferenceNumber: referenceNumber + 1,
    });
    return transaction;
  },
};

/** The active implementation. Swap this export to connect a real backend. */
export const customerData: CustomerDataService = demoCustomerDataService;
