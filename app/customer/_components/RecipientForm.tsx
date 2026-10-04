"use client";

import { useState, type FormEvent } from "react";
import { DEMO_BANK_LIST_NOTICE } from "../_lib/banks";
import { maskAccountNumber } from "../_lib/format";
import { RECIPIENT_TYPES, SENDING_REASONS } from "../_lib/reference-data";
import type { Bank, NewRecipientInput, Recipient, RecipientType } from "../_lib/types";
import { hasErrors, validateRecipient, type FieldErrors, type RecipientField } from "../_lib/validation";
import { Alert } from "./ui/Alert";
import { Button } from "./ui/Button";
import { SelectField, TextField } from "./ui/FormField";

interface FormValues {
  type: RecipientType;
  businessName: string;
  firstName: string;
  middleName: string;
  lastName: string;
  phone: string;
  sendingReason: string;
  bankId: string;
  accountNumber: string;
  confirmAccountNumber: string;
}

const EMPTY: FormValues = {
  type: "individual",
  businessName: "",
  firstName: "",
  middleName: "",
  lastName: "",
  phone: "",
  sendingReason: "",
  bankId: "",
  accountNumber: "",
  confirmAccountNumber: "",
};

function sampleValues(type: RecipientType, bankId: string): FormValues {
  const n = Math.floor(1000 + Math.random() * 9000);
  return {
    type,
    businessName: type === "business" ? "Sample Trading PLC" : "",
    firstName: "Test",
    middleName: "",
    lastName: `Recipient ${n}`,
    phone: `+251 900 00${String(n).slice(0, 1)} ${String(n).slice(1)}`,
    sendingReason: type === "business" ? "Business payment" : "Family support",
    bankId,
    accountNumber: `00000000${n}`,
    confirmAccountNumber: `00000000${n}`,
  };
}

/**
 * Add-recipient form.
 *
 * SECURITY: the full account number exists only in this component's
 * in-memory state while the user types. On submit it is handed to the data
 * service, which keeps only the last 4 digits; the form then clears itself.
 */
export function RecipientForm({
  banks,
  onSubmit,
  onCancel,
  submitLabel = "Save recipient",
}: {
  /** Bank options, loaded via the data service so they can come from a database later. */
  banks: Bank[];
  onSubmit(input: NewRecipientInput): Promise<Recipient>;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors<RecipientField>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key as RecipientField]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);
    const input: NewRecipientInput = {
      type: values.type,
      businessName: values.businessName,
      firstName: values.firstName,
      middleName: values.middleName,
      lastName: values.lastName,
      phone: values.phone,
      sendingReason: values.sendingReason,
      bankId: values.bankId,
      accountNumber: values.accountNumber,
    };
    const nextErrors = validateRecipient({ ...input, confirmAccountNumber: values.confirmAccountNumber });
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;
    setSubmitting(true);
    try {
      await onSubmit(input);
      setValues(EMPTY); // discard the full account number from memory
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not save the recipient. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const isBusiness = values.type === "business";
  const accountDigits = values.accountNumber.replace(/\D/g, "");

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <Alert tone="warning" title="Use made-up details only">
        This is a demo. Do not enter a real person&apos;s bank account or phone number.
      </Alert>

      <fieldset>
        <legend className="mb-1.5 block text-sm font-medium text-slate-800">Recipient type</legend>
        <div className="grid grid-cols-2 gap-2">
          {RECIPIENT_TYPES.map((option) => (
            <label
              key={option.id}
              className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm font-medium ${
                values.type === option.id ? "border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-600" : "border-slate-300 bg-white text-slate-800"
              }`}
            >
              <input
                type="radio"
                name="recipientType"
                value={option.id}
                checked={values.type === option.id}
                onChange={() => update("type", option.id)}
                className="h-4 w-4 accent-blue-600"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {isBusiness && (
        <TextField
          label="Business name"
          value={values.businessName}
          onChange={(e) => update("businessName", e.target.value)}
          error={errors.businessName}
          autoComplete="off"
        />
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          label={isBusiness ? "Contact first name" : "First name"}
          value={values.firstName}
          onChange={(e) => update("firstName", e.target.value)}
          error={errors.firstName}
          autoComplete="off"
        />
        <TextField
          label={isBusiness ? "Contact middle name" : "Middle name"}
          optional
          value={values.middleName}
          onChange={(e) => update("middleName", e.target.value)}
          autoComplete="off"
        />
        <TextField
          label={isBusiness ? "Contact last name" : "Last name"}
          value={values.lastName}
          onChange={(e) => update("lastName", e.target.value)}
          error={errors.lastName}
          autoComplete="off"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Phone number"
          type="tel"
          inputMode="tel"
          placeholder="+251 9XX XXX XXX"
          value={values.phone}
          onChange={(e) => update("phone", e.target.value)}
          error={errors.phone}
          autoComplete="off"
        />
        <SelectField
          label="Sending reason"
          value={values.sendingReason}
          onChange={(e) => update("sendingReason", e.target.value)}
          error={errors.sendingReason}
          placeholder="Choose a reason"
          options={SENDING_REASONS.map((r) => ({ value: r, label: r }))}
        />
      </div>

      <SelectField
        label="Bank"
        value={values.bankId}
        onChange={(e) => update("bankId", e.target.value)}
        error={errors.bankId}
        hint={DEMO_BANK_LIST_NOTICE}
        placeholder="Choose a bank"
        options={banks.map((b) => ({ value: b.id, label: b.name }))}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Account number"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          value={values.accountNumber}
          onChange={(e) => update("accountNumber", e.target.value.replace(/[^\d\s]/g, ""))}
          error={errors.accountNumber}
          hint="Demo: use a made-up 8–16 digit number."
        />
        <TextField
          label="Confirm account number"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          value={values.confirmAccountNumber}
          onChange={(e) => update("confirmAccountNumber", e.target.value.replace(/[^\d\s]/g, ""))}
          onPaste={(e) => e.preventDefault()}
          error={errors.confirmAccountNumber}
          hint="Type it again — pasting is disabled."
        />
      </div>
      {accountDigits.length >= 4 && (
        <p className="text-xs text-slate-500">
          After saving, this account will only be shown as <span className="font-medium text-slate-700">{maskAccountNumber(accountDigits)}</span>.
        </p>
      )}

      {submitError && <Alert tone="error">{submitError}</Alert>}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={() => { setValues(sampleValues(values.type, banks[0]?.id ?? "")); setErrors({}); }}>
          Fill with sample demo details
        </Button>
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          {onCancel && (
            <Button variant="secondary" onClick={onCancel} disabled={submitting}>
              Cancel
            </Button>
          )}
          <Button type="submit" loading={submitting} loadingText="Saving…">
            {submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
