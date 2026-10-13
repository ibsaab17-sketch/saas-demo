import type { NewRecipientInput } from "./types";

/**
 * Client-side validation used to provide immediate feedback to users.
 *
 * Security-sensitive validation and authorization must also be enforced
 * by the server/API. Client-side validation alone must never be trusted
 * for protecting customer or transaction data.
 */

export type FieldErrors<T extends string = string> = Partial<
  Record<T, string>
>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

export function passwordProblems(
  value: string,
): string | null {
  if (value.length < 8) {
    return "Use at least 8 characters.";
  }

  if (
    !/[A-Za-z]/.test(value) ||
    !/\d/.test(value)
  ) {
    return "Include at least one letter and one number.";
  }

  return null;
}

export function hasErrors(
  errors: Record<string, string | undefined>,
): boolean {
  return Object.values(errors).some(Boolean);
}

export type RegistrationField =
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "password"
  | "confirmPassword"
  | "acceptTerms";

export function validateRegistration(
  values: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
    acceptTerms: boolean;
  },
): FieldErrors<RegistrationField> {
  const errors: FieldErrors<RegistrationField> = {};

  if (!values.firstName.trim()) {
    errors.firstName = "Enter your first name.";
  }

  if (!values.lastName.trim()) {
    errors.lastName = "Enter your last name.";
  }

  if (!isValidEmail(values.email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!isValidPhone(values.phone)) {
    errors.phone =
      "Enter a valid phone number (10–15 digits).";
  }

  const passwordError = passwordProblems(
    values.password,
  );

  if (passwordError) {
    errors.password = passwordError;
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "Confirm your password.";
  } else if (
    values.confirmPassword !== values.password
  ) {
    errors.confirmPassword = "Passwords do not match.";
  }

  if (!values.acceptTerms) {
    errors.acceptTerms =
      "You must accept the terms to continue.";
  }

  return errors;
}

export type RecipientField =
  | "firstName"
  | "lastName"
  | "businessName"
  | "phone"
  | "sendingReason"
  | "bankId"
  | "accountNumber"
  | "confirmAccountNumber";

export function validateRecipient(
  values: NewRecipientInput & {
    confirmAccountNumber: string;
  },
): FieldErrors<RecipientField> {
  const errors: FieldErrors<RecipientField> = {};

  if (
    values.type === "business" &&
    !values.businessName?.trim()
  ) {
    errors.businessName = "Enter the business name.";
  }

  if (!values.firstName.trim()) {
    errors.firstName =
      values.type === "business"
        ? "Enter the contact's first name."
        : "Enter a first name.";
  }

  if (!values.lastName.trim()) {
    errors.lastName =
      values.type === "business"
        ? "Enter the contact's last name."
        : "Enter a last name.";
  }

  if (!isValidPhone(values.phone)) {
    errors.phone =
      "Enter a valid phone number (10–15 digits).";
  }

  if (!values.sendingReason) {
    errors.sendingReason =
      "Choose a reason for sending.";
  }

  if (!values.bankId) {
    errors.bankId = "Choose a bank.";
  }

  const account = values.accountNumber.replace(
    /\s/g,
    "",
  );

  if (!/^\d{8,16}$/.test(account)) {
    errors.accountNumber =
      "Enter an 8–16 digit account number.";
  }

  if (!values.confirmAccountNumber) {
    errors.confirmAccountNumber =
      "Re-enter the account number.";
  } else if (
    values.confirmAccountNumber.replace(/\s/g, "") !==
    account
  ) {
    errors.confirmAccountNumber =
      "Account numbers do not match.";
  }

  return errors;
}