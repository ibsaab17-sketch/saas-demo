/**
 * Shared domain types for the BusinessFlow Customer Portal.
 */

export type CurrencyCode = "CAD" | "ETB";

export type TransferStatus =
  | "Pending"
  | "Processing"
  | "Completed"
  | "Cancelled";

export type DeliverySpeed = "standard" | "express";

export type RecipientType = "individual" | "business";

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  createdAt: string;
  notificationPreferences: NotificationPreferences;
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
  shortName: string;
}

export interface Recipient {
  id: string;
  customerId: string;
  type: RecipientType;
  firstName: string;
  middleName?: string;
  lastName: string;
  businessName?: string;
  phone: string;
  sendingReason: string;
  bankId: string;
  accountLast4: string;
  createdAt: string;
}

export interface FeeOption {
  id: DeliverySpeed;
  label: string;
  description: string;
  feeCad: number;
}

export interface Quote {
  /** Amount entered by the customer. */
  sendAmountCad: number;

  /** Amount actually converted to ETB. */
  amountConvertedCad: number;

  /** ETB per 1 CAD. */
  exchangeRate: number;

  /** Business transfer fee. */
  feeCad: number;

  /**
   * false = fee is added on top.
   * true = fee is included in the entered amount.
   */
  feeIncludedInAmount: boolean;

  /** Final amount paid by the customer. */
  totalCad: number;

  /** Final ETB amount received. */
  receiveAmountEtb: number;

  deliverySpeed: DeliverySpeed;

  quotedAt: string;
}

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
  reference: string;
  createdAt: string;
  status: TransferStatus;
  customerId: string;
  customerName: string;
  recipient: RecipientSnapshot;

  /** Amount originally entered by the customer. */
  sendAmountCad: number;

  /** Amount actually converted after fee treatment. */
  amountConvertedCad: number;

  /** Exchange rate used when the transaction was quoted. */
  exchangeRate: number;

  /** Transfer fee used for this transaction. */
  feeCad: number;

  /**
   * false = fee was added on top.
   * true = fee was included in the entered amount.
   */
  feeIncludedInAmount: boolean;

  /** Final amount paid by the customer. */
  totalCad: number;

  /** Final amount the recipient receives in ETB. */
  receiveAmountEtb: number;

  deliverySpeed: DeliverySpeed;
}

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

  /** Amount entered by the customer. */
  sendAmountCad: number;

  deliverySpeed: DeliverySpeed;

  /** Business exchange rate shown and approved by the customer. */
  exchangeRate: number;

  /** Business transfer fee shown and approved by the customer. */
  feeCad: number;

  /**
   * Customer's fee choice.
   * false = fee added on top.
   * true = fee included in entered amount.
   */
  feeIncludedInAmount: boolean;
}

export interface RegistrationInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  businessSlug: string;
}

export interface ProfileUpdateInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}