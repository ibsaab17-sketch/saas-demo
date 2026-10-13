"use client";

import Link from "next/link";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  Suspense,
  useEffect,
  useState,
  type FormEvent,
} from "react";

import { PublicHeader } from "../_components/PublicHeader";
import { Alert } from "../_components/ui/Alert";
import { Button } from "../_components/ui/Button";
import { TextField } from "../_components/ui/FormField";
import { LoadingBlock } from "../_components/ui/Spinner";
import { useSession } from "../_lib/session-context";
import { isValidEmail } from "../_lib/validation";

/**
 * Only allow redirects back into the
 * customer portal. This prevents open redirects.
 */
function safeNext(
  raw: string | null,
): string {
  if (
    raw &&
    raw.startsWith("/customer/") &&
    !raw.startsWith("//")
  ) {
    return raw;
  }

  return "/customer/dashboard";
}

function LoginForm() {
  const router = useRouter();
  const searchParams =
    useSearchParams();

  const next = safeNext(
    searchParams.get("next"),
  );

  const {
    status,
    signIn,
  } = useSession();

  const [
    email,
    setEmail,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    errors,
    setErrors,
  ] = useState<{
    email?: string;
    password?: string;
  }>({});

  const [
    formError,
    setFormError,
  ] = useState<string | null>(
    null,
  );

  const [
    pending,
    setPending,
  ] = useState(false);

  const [
    showForgot,
    setShowForgot,
  ] = useState(false);

  useEffect(() => {
    if (
      status === "signedIn"
    ) {
      router.replace(next);
    }
  }, [
    status,
    next,
    router,
  ]);

  async function handleSubmit(
    event: FormEvent,
  ) {
    event.preventDefault();

    setFormError(null);

    const nextErrors: {
      email?: string;
      password?: string;
    } = {};

    if (!isValidEmail(email)) {
      nextErrors.email =
        "Enter a valid email address.";
    }

    if (!password) {
      nextErrors.password =
        "Enter your password.";
    }

    setErrors(nextErrors);

    if (
      nextErrors.email ||
      nextErrors.password
    ) {
      return;
    }

    setPending(true);

    try {
      await signIn(
        email,
        password,
      );

      setPassword("");
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Sign in failed. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <h1 className="text-2xl font-bold text-slate-900">
        Sign in
      </h1>

      <p className="mt-1 text-sm text-slate-600">
        Welcome back. Sign in to manage
        your transfers and track their
        status.
      </p>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-6 space-y-4"
      >
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(
              event.target.value,
            );

            if (errors.email) {
              setErrors(
                (current) => ({
                  ...current,
                  email: undefined,
                }),
              );
            }
          }}
          error={errors.email}
        />

        <div>
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => {
              setPassword(
                event.target.value,
              );

              if (
                errors.password
              ) {
                setErrors(
                  (current) => ({
                    ...current,
                    password:
                      undefined,
                  }),
                );
              }
            }}
            error={
              errors.password
            }
          />

          <div className="mt-2 text-right">
            <button
              type="button"
              onClick={() =>
                setShowForgot(
                  (value) =>
                    !value,
                )
              }
              aria-expanded={
                showForgot
              }
              className="min-h-11 text-sm font-medium text-blue-700 hover:underline"
            >
              Forgot password?
            </button>
          </div>

          {showForgot && (
            <Alert
              tone="info"
              title="Password reset"
            >
              Password reset by email
              will be available soon.
            </Alert>
          )}
        </div>

        {formError && (
          <Alert tone="error">
            {formError}
          </Alert>
        )}

        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={pending}
          loadingText="Signing in…"
          disabled={pending}
        >
          Sign in
        </Button>
      </form>

      <p className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-600">
        New to BusinessFlow?{" "}
        <Link
          href="/customer/register"
          className="font-semibold text-blue-700 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <>
      <PublicHeader
        showActions={false}
      />

      <main className="flex-1 px-4 py-8 sm:py-12">
        <div className="mx-auto w-full max-w-md">
          <Suspense
            fallback={
              <LoadingBlock />
            }
          >
            <LoginForm />
          </Suspense>

          <p className="mt-4 text-center text-sm">
            <Link
              href="/customer"
              className="text-slate-600 hover:underline"
            >
              ← Back to calculator
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}