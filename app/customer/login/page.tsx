"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { PublicHeader } from "../_components/PublicHeader";
import { Alert } from "../_components/ui/Alert";
import { Button } from "../_components/ui/Button";
import { DemoBanner } from "../_components/ui/DemoBanner";
import { TextField } from "../_components/ui/FormField";
import { LoadingBlock } from "../_components/ui/Spinner";
import { useSession } from "../_lib/session-context";
import { isValidEmail } from "../_lib/validation";

/** Only allow redirects back into the customer portal (prevents open redirects). */
function safeNext(raw: string | null): string {
  if (raw && raw.startsWith("/customer/") && !raw.startsWith("//")) return raw;
  return "/customer/dashboard";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const { status, signIn, signInWithDemoAccount } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState<"form" | "demo" | null>(null);
  const [showForgot, setShowForgot] = useState(false);

  useEffect(() => {
    if (status === "signedIn") router.replace(next);
  }, [status, next, router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const nextErrors: typeof errors = {};
    if (!isValidEmail(email)) nextErrors.email = "Enter a valid email address.";
    if (!password) nextErrors.password = "Enter your password.";
    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) return;
    setPending("form");
    try {
      await signIn(email, password);
      setPassword("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Sign in failed. Please try again.");
    } finally {
      setPending(null);
    }
  }

  async function handleDemo() {
    setFormError(null);
    setPending("demo");
    try {
      await signInWithDemoAccount();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not open the demo account.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <h1 className="text-2xl font-bold text-slate-900">Sign in</h1>
      <p className="mt-1 text-sm text-slate-600">Welcome back. Sign in to send money and track transfers.</p>

      <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm font-semibold text-blue-900">Just exploring?</p>
        <p className="mt-0.5 text-sm text-blue-900/80">Open a demo account pre-filled with synthetic recipients and transfers.</p>
        <Button
          className="mt-3"
          fullWidth
          onClick={handleDemo}
          loading={pending === "demo"}
          loadingText="Opening demo account…"
          disabled={pending !== null}
        >
          Use demo account
        </Button>
      </div>

      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
        <span className="h-px flex-1 bg-slate-200" /> or sign in with email <span className="h-px flex-1 bg-slate-200" />
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <div>
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
          <div className="mt-2 text-right">
            <button
              type="button"
              onClick={() => setShowForgot((v) => !v)}
              aria-expanded={showForgot}
              className="min-h-11 text-sm font-medium text-blue-700 hover:underline"
            >
              Forgot password?
            </button>
          </div>
          {showForgot && (
            <Alert tone="info" title="Password reset is not available in the demo">
              In the live portal you&apos;ll receive a secure reset link by email.
            </Alert>
          )}
        </div>

        {formError && <Alert tone="error">{formError}</Alert>}

        <Button type="submit" size="lg" fullWidth loading={pending === "form"} loadingText="Signing in…" disabled={pending !== null}>
          Sign in
        </Button>
        <p className="text-xs text-slate-500">
          Demo only: there is no real authentication. Your password is not checked or stored.
        </p>
      </form>

      <p className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-600">
        New to BusinessFlow?{" "}
        <Link href="/customer/register" className="font-semibold text-blue-700 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <>
      <DemoBanner />
      <PublicHeader showActions={false} />
      <main className="flex-1 px-4 py-8 sm:py-12">
        <div className="mx-auto w-full max-w-md">
          <Suspense fallback={<LoadingBlock />}>
            <LoginForm />
          </Suspense>
          <p className="mt-4 text-center text-sm">
            <Link href="/customer" className="text-slate-600 hover:underline">← Back to calculator</Link>
          </p>
        </div>
      </main>
    </>
  );
}
