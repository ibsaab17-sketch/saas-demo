"use client";

import { useState, type FormEvent } from "react";
import { maskAccountNumber } from "../_lib/format";
import {
  RECIPIENT_TYPES,
  SENDING_REASONS,
} from "../_lib/reference-data";
import type {
  Bank,
  NewRecipientInput,
  Recipient,
  RecipientType,
} from "../_lib/types";
import {
  hasErrors,
  validateRecipient,
  type FieldErrors,
  type RecipientField,
} from "../_lib/validation";
import { Alert } from "./ui/Alert";
import { Button } from "./ui/Button";
import {
  SelectField,
  TextField,
} from "./ui/FormField";

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

/**
 * Add-recipient form.
 *
 * SECURITY:
 * The full account number exists in this component's state
 * only while the customer enters it. The recipient API is
 * responsible for securely storing the account information.
 * The UI displays only a masked account number after saving.
 */
export function RecipientForm({
  banks,
  onSubmit,
  onCancel,
  submitLabel = "Save recipient",
}: {
  banks: Bank[];
  onSubmit(
    input: NewRecipientInput,
  ): Promise<Recipient>;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const [values, setValues] =
    useState<FormValues>(EMPTY);

  const [errors, setErrors] =
    useState<FieldErrors<RecipientField>>({});

  const [submitError, setSubmitError] =
    useState<string | null>(null);

  const [submitting, setSubmitting] =
    useState(false);

  function update<K extends keyof FormValues>(
    key: K,
    value: FormValues[K],
  ) {
    setValues((previous) => ({
      ...previous,
      [key]: value,
    }));

    if (errors[key as RecipientField]) {
      setErrors((previous) => ({
        ...previous,
        [key]: undefined,
      }));
    }
  }

  async function handleSubmit(
    event: FormEvent,
  ) {
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

    const nextErrors = validateRecipient({
      ...input,
      confirmAccountNumber:
        values.confirmAccountNumber,
    });

    setErrors(nextErrors);

    if (hasErrors(nextErrors)) {
      return;
    }

    setSubmitting(true);

    try {
      await onSubmit(input);

      // Remove sensitive account-number values
      // from local component state after saving.
      setValues(EMPTY);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Could not save the recipient. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const isBusiness =
    values.type === "business";

  const accountDigits =
    values.accountNumber.replace(
      /\D/g,
      "",
    );

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-5"
    >
      <fieldset>
        <legend className="mb-1.5 block text-sm font-medium text-slate-800">
          Recipient type
        </legend>

        <div className="grid grid-cols-2 gap-2">
          {RECIPIENT_TYPES.map(
            (option) => (
              <label
                key={option.id}
                className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm font-medium ${
                  values.type ===
                  option.id
                    ? "border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-600"
                    : "border-slate-300 bg-white text-slate-800"
                }`}
              >
                <input
                  type="radio"
                  name="recipientType"
                  value={option.id}
                  checked={
                    values.type ===
                    option.id
                  }
                  onChange={() =>
                    update(
                      "type",
                      option.id,
                    )
                  }
                  className="h-4 w-4 accent-blue-600"
                />

                {option.label}
              </label>
            ),
          )}
        </div>
      </fieldset>

      {isBusiness && (
        <TextField
          label="Business name"
          value={values.businessName}
          onChange={(event) =>
            update(
              "businessName",
              event.target.value,
            )
          }
          error={errors.businessName}
          autoComplete="off"
        />
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          label={
            isBusiness
              ? "Contact first name"
              : "First name"
          }
          value={values.firstName}
          onChange={(event) =>
            update(
              "firstName",
              event.target.value,
            )
          }
          error={errors.firstName}
          autoComplete="off"
        />

        <TextField
          label={
            isBusiness
              ? "Contact middle name"
              : "Middle name"
          }
          optional
          value={values.middleName}
          onChange={(event) =>
            update(
              "middleName",
              event.target.value,
            )
          }
          autoComplete="off"
        />

        <TextField
          label={
            isBusiness
              ? "Contact last name"
              : "Last name"
          }
          value={values.lastName}
          onChange={(event) =>
            update(
              "lastName",
              event.target.value,
            )
          }
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
          onChange={(event) =>
            update(
              "phone",
              event.target.value,
            )
          }
          error={errors.phone}
          autoComplete="off"
        />

        <SelectField
          label="Sending reason"
          value={values.sendingReason}
          onChange={(event) =>
            update(
              "sendingReason",
              event.target.value,
            )
          }
          error={errors.sendingReason}
          placeholder="Choose a reason"
          options={SENDING_REASONS.map(
            (reason) => ({
              value: reason,
              label: reason,
            }),
          )}
        />
      </div>

      <SelectField
        label="Bank"
        value={values.bankId}
        onChange={(event) =>
          update(
            "bankId",
            event.target.value,
          )
        }
        error={errors.bankId}
        hint="Select the recipient's bank."
        placeholder="Choose a bank"
        options={banks.map((bank) => ({
          value: bank.id,
          label: bank.name,
        }))}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Account number"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          value={values.accountNumber}
          onChange={(event) =>
            update(
              "accountNumber",
              event.target.value.replace(
                /[^\d\s]/g,
                "",
              ),
            )
          }
          error={errors.accountNumber}
          hint="Enter the recipient's bank account number."
        />

        <TextField
          label="Confirm account number"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          value={
            values.confirmAccountNumber
          }
          onChange={(event) =>
            update(
              "confirmAccountNumber",
              event.target.value.replace(
                /[^\d\s]/g,
                "",
              ),
            )
          }
          onPaste={(event) =>
            event.preventDefault()
          }
          error={
            errors.confirmAccountNumber
          }
          hint="Type the account number again. Pasting is disabled."
        />
      </div>

      {accountDigits.length >= 4 && (
        <p className="text-xs text-slate-500">
          After saving, the account
          number will be displayed as{" "}
          <span className="font-medium text-slate-700">
            {maskAccountNumber(
              accountDigits,
            )}
          </span>
          .
        </p>
      )}

      {submitError && (
        <Alert tone="error">
          {submitError}
        </Alert>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
        )}

        <Button
          type="submit"
          loading={submitting}
          loadingText="Saving…"
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}