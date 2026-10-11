"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../utils/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (signInError) {
        throw new Error(signInError.message);
      }

      if (!data.user) {
        throw new Error("Unable to sign in.");
      }

      const { data: membership, error: membershipError } = await supabase
        .from("business_members")
        .select("business_id, role, status")
        .eq("user_id", data.user.id)
        .eq("status", "active")
        .maybeSingle();

      if (membershipError) {
        await supabase.auth.signOut();
        throw new Error(membershipError.message);
      }

      if (!membership) {
        await supabase.auth.signOut();
        throw new Error(
          "This account does not have access to the business dashboard.",
        );
      }

      if (
        membership.role !== "owner" &&
        membership.role !== "admin"
      ) {
        await supabase.auth.signOut();
        throw new Error(
          "Only an owner or administrator can access this dashboard.",
        );
      }

      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            BusinessFlow
          </h1>

          <h2 className="mt-6 text-xl font-semibold text-slate-900">
            Business Login
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Sign in to manage your business.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-slate-700"
          >
            Email
          </label>

          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-blue-500"
          />

          <label
            htmlFor="password"
            className="mt-5 block text-sm font-medium text-slate-700"
          >
            Password
          </label>

          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-blue-500"
          />

          {error && (
            <div className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Business owner and administrator access
        </p>
      </div>
    </main>
  );
}