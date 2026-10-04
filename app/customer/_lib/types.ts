/**
 * Shared domain types for the BusinessFlow Customer Portal.
 *
 * These mirror the shape we expect from the future Supabase/PostgreSQL
 * schema so presentation components do not need to change when the demo
 * services are replaced with real ones.
 */

export type CurrencyCode = "CAD" | "ETB";

export type TransferStatus = "Pending" | "Processing" | "Completed" | "Cancelled";

export type DeliverySpeed = "standard" | "express";

export type RecipientType = "individual" | "business";

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  createdAt: string; // ISO date
  notificationPreferences: NotificationPreferences;
  isDemo: true;
}

export interface NotificationPreferences {
  emailTransferUpdates: boolean;
  smsTransferUpdates: boolean;
  rateAlerts: boolean;
  marketing: boolean;
}

export interface Bank {
  id: string;
  name: string;
  /** Short code for display only. Not a real routing/SWIFT code. */
  shortName: string;
}

export interface Recipient {
  id: string;
  /** Owning customer. In production this is enforced with Row Level Security. */
  customerId: string;
  type: RecipientType;
  /** Individual recipients */
  firstName: string;
  middleName?: string;
  lastName: string;
  /** Business recipients */
  businessName?: string;
  phone: string;
  sendingReason: string;
  bankId: string;
  /**
   * SECURITY: the full account number is never stored by the portal.
   * Only the last four digits are kept, for masked display.
   */
  accountLast4: string;
  createdAt: string;
  isDemo: true;
}

export interface FeeOption {
  id: DeliverySpeed;
  label: string;
  description: string;
  feeCad: number;
}

export interface Quote {
  sendAmountCad: number;
  exchangeRate: number; // ETB per 1 CAD
  feeCad: number;
  totalCad: number;
  receiveAmountEtb: number;
  deliverySpeed: DeliverySpeed;
  /** When this quote was generated (ISO). */
  quotedAt: string;
  /** Demo quotes are never live market rates. */
  isDemoRate: true;
}

/**
 * A snapshot of recipient details captured at submission time, so a
 * receipt stays accurate even if the saved recipient is later edited.
 */
export interface RecipientSnapshot {
  recipientId: string;
  displayName: string;
  bankName: string;
  accountLast4: string;
  phone: string;
  sendingReason: string;
}

export interface Transaction {
  id: string;
  reference: string; // e.g. DEMO-BF-240001
  createdAt: string;
  status: TransferStatus;
  customerId: string;
  customerName: string;
  recipient: RecipientSnapshot;
  sendAmountCad: number;
  exchangeRate: number;
  feeCad: number;
  totalCad: number;
  receiveAmountEtb: number;
  deliverySpeed: DeliverySpeed;
  isDemo: true;
}

/** Input used when adding a recipient. Contains the full account number only transiently. */
export interface NewRecipientInput {
  type: RecipientType;
  firstName: string;
  middleName?: string;
  lastName: string;
  businessName?: string;
  phone: string;
  sendingReason: string;
  bankId: string;
  accountNumber: string;
}

export interface TransferRequestInput {
  recipientId: string;
  sendAmountCad: number;
  deliverySpeed: DeliverySpeed;
}

export interface RegistrationInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  /** Used for demo validation only. Never stored. */
  password: string;
}

export interface ProfileUpdateInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}
