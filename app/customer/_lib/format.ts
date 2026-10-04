import type { Recipient } from "./types";

const cadFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  currencyDisplay: "narrowSymbol",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const etbNumberFormatter = new Intl.NumberFormat("en-CA", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const rateFormatter = new Intl.NumberFormat("en-CA", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** e.g. "$1,250.00" */
export function formatCad(amount: number): string {
  return cadFormatter.format(amount);
}

/** e.g. "119,375.00 ETB" */
export function formatEtb(amount: number): string {
  return `${etbNumberFormatter.format(amount)} ETB`;
}

/** e.g. "1 CAD = 95.50 ETB" */
export function formatRate(rate: number): string {
  return `1 CAD = ${rateFormatter.format(rate)} ETB`;
}

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

/**
 * Masks an account number for display, e.g. "•••• 4821".
 * Accepts either a full number (only while typing) or the stored last 4.
 */
export function maskAccountNumber(accountOrLast4: string): string {
  const digits = accountOrLast4.replace(/\D/g, "");
  const last4 = digits.slice(-4);
  return last4 ? `•••• ${last4}` : "••••";
}

/** Masks all but the last 4 digits of a phone number, e.g. "••• ••• 4567". */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return phone;
  return `••• ••• ${digits.slice(-4)}`;
}

export function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/** Display name for a saved recipient (business name for businesses). */
export function recipientDisplayName(recipient: Recipient): string {
  if (recipient.type === "business" && recipient.businessName) return recipient.businessName;
  return [recipient.firstName, recipient.middleName, recipient.lastName].filter(Boolean).join(" ");
}
