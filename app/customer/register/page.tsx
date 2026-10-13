"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { PublicHeader } from "../_components/PublicHeader";
import { Alert } from "../_components/ui/Alert";
import { Button, ButtonLink } from "../_components/ui/Button";
import {
  CheckboxField,
  TextField,
} from "../_components/ui/FormField";
import { useSession } from "../_lib/session-context";
import {
  hasErrors,
  validateRegistration,
  type FieldErrors,
  type RegistrationField,
} from "../_lib/validation";

const EMPTY = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  acceptTerms: false,
};

export default function RegisterPage() {
  const { signUp, customer } = useSession();

  const [values, setValues] = useState(EMPTY);

  const [errors, setErrors] =
    useState<FieldErrors<RegistrationField>>({});

  const [formError, setFormError] =
    useState<string | null>(null);

  const [submitting, setSubmitting] =
    useState(false);

  const [done, setDone] =
    useState(false);

  function update<K extends keyof typeof EMPTY>(
    key: K,
    value: (typeof EMPTY)[K],
  ) {
    setValues((previous) => ({
      ...previous,
      [key]: value,
    }));

    if (errors[key as RegistrationField]) {
      setErrors((previous) => ({
        ...previous,
        [key]: undefined,
      }));
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const nextErrors =
      validateRegistration(values);

    setErrors(nextErrors);

    if (hasErrors(nextErrors)) {
      return;
    }

    setSubmitting(true);

    try {
      await signUp({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        password: values.password,
      });

      // Clear password values from local component state
      // after the signup request completes.
      setValues((previous) => ({
        ...previous,
        password: "",
        confirmPassword: "",
      }));

      setDone(true);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Could not create your account. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PublicHeader showActions={false} />

      <main className="flex-1 px-4 py-8 sm:py-12">
        <div className="mx-auto w-full max-w-xl">
          {done ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
              <div
                aria-hidden="true"
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-700"
              >
                ✓
              </div>

              <h1 className="mt-4 text-2xl font-bold text-slate-900">
                Your account is ready
              </h1>

              <p className="mt-2 text-sm text-slate-600">
                Welcome
                {customer
                  ? `, ${customer.firstName}`
                  : ""}
                ! Your BusinessFlow customer account has
                been created.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <ButtonLink
                  href="/customer/dashboard"
                  size="lg"
                  fullWidth
                >
                  Continue to dashboard
                </ButtonLink>

                <ButtonLink
                  href="/customer/send"
                  size="lg"
                  variant="secondary"
                  fullWidth
                >
                  Start a transfer
                </ButtonLink>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
              <h1 className="text-2xl font-bold text-slate-900">
                Create your account
              </h1>

              <p className="mt-1 text-sm text-slate-600">
                Create your BusinessFlow account to manage
                recipients and transfer requests.
              </p>

              <form
                onSubmit={handleSubmit}
                noValidate
                className="mt-6 space-y-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    label="First name"
                    autoComplete="given-name"
                    value={values.firstName}
                    onChange={(event) =>
                      update(
                        "firstName",
                        event.target.value,
                      )
                    }
                    error={errors.firstName}
                  />

                  <TextField
                    label="Last name"
                    autoComplete="family-name"
                    value={values.lastName}
                    onChange={(event) =>
                      update(
                        "lastName",
                        event.target.value,
                      )
                    }
                    error={errors.lastName}
                  />
                </div>

                <TextField
                  label="Email"
                  type="email"
                  autoComplete="email"
                  value={values.email}
                  onChange={(event) =>
                    update(
                      "email",
                      event.target.value,
                    )
                  }
                  error={errors.email}
                />

                <TextField
                  label="Phone number"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+1 (555) 010-0000"
                  value={values.phone}
                  onChange={(event) =>
                    update(
                      "phone",
                      event.target.value,
                    )
                  }
                  error={errors.phone}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    label="Password"
                    type="password"
                    autoComplete="new-password"
                    value={values.password}
                    onChange={(event) =>
                      update(
                        "password",
                        event.target.value,
                      )
                    }
                    error={errors.password}
                    hint="8+ characters with a letter and a number."
                  />

                  <TextField
                    label="Confirm password"
                    type="password"
                    autoComplete="new-password"
                    value={values.confirmPassword}
                    onChange={(event) =>
                      update(
                        "confirmPassword",
                        event.target.value,
                      )
                    }
                    error={errors.confirmPassword}
                  />
                </div>

                <CheckboxField
                  label="I agree to the Terms of Use and Privacy Policy."
                  description="Please review and accept the terms before creating your account."
                  checked={values.acceptTerms}
                  onChange={(event) =>
                    update(
                      "acceptTerms",
                      event.target.checked,
                    )
                  }
                  error={errors.acceptTerms}
                />

                {formError && (
                  <Alert tone="error">
                    {formError}
                  </Alert>
                )}

                <Button
                  type="submit"
                  size="lg"
                  fullWidth
                  loading={submitting}
                  loadingText="Creating account…"
                  disabled={submitting}
                >
                  Create account
                </Button>
              </form>

              <p className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-600">
                Already have an account?{" "}
                <Link
                  href="/customer/login"
                  className="font-semibold text-blue-700 hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}