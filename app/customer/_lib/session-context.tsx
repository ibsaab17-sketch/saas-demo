"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { authService } from "./services/auth-service";
import {
  getSupabaseSession,
  signInWithSupabase,
  signUpWithSupabase,
  signOutFromSupabase,
} from "./services/supabase-auth-service";
import { getSupabaseCustomerProfile } from "./services/supabase-customer-service";
import type { Customer, RegistrationInput } from "./types";

type SessionStatus = "loading" | "signedOut" | "signedIn";

interface SessionContextValue {
  status: SessionStatus;
  customer: Customer | null;
  signIn(email: string, password: string): Promise<void>;
  signInWithDemoAccount(): Promise<void>;
  signUp(input: RegistrationInput): Promise<void>;
  signOut(): Promise<void>;
  resetDemo(): Promise<void>;
  setCustomer(customer: Customer): void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [customer, setCustomerState] = useState<Customer | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const session = await getSupabaseSession();

        if (cancelled) return;

        if (!session) {
          setCustomerState(null);
          setStatus("signedOut");
          return;
        }

        const profile = await getSupabaseCustomerProfile();

        if (cancelled) return;

        setCustomerState(profile);
        setStatus(profile ? "signedIn" : "signedOut");
      } catch {
        if (cancelled) return;
        setCustomerState(null);
        setStatus("signedOut");
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      customer,

      async signIn(email, password) {
        await signInWithSupabase(email, password);

        const profile = await getSupabaseCustomerProfile();

        if (!profile) {
          await signOutFromSupabase();
          throw new Error(
            "Your login is valid, but no active customer profile is linked to this account.",
          );
        }

        setCustomerState(profile);
        setStatus("signedIn");
      },

      async signInWithDemoAccount() {
        const session = await authService.signInWithDemoAccount();

        const { customerData } = await import("./services/data-service");
        const profile = await customerData.getProfile(session.customerId);

        setCustomerState(profile);
        setStatus(profile ? "signedIn" : "signedOut");
      },

      async signUp(input) {
        await signUpWithSupabase(
          input.firstName,
          input.lastName,
          input.email,
          input.phone,
          input.password,
        );

        const session = await getSupabaseSession();

        // Email confirmation may be required by Supabase.
        // In that case there is no active session yet.
        if (!session) {
          setCustomerState(null);
          setStatus("signedOut");
          return;
        }

        const profile = await getSupabaseCustomerProfile();

        setCustomerState(profile);
        setStatus(profile ? "signedIn" : "signedOut");
      },

      async signOut() {
        if (customer?.isDemo) {
          await authService.signOut();
        } else {
          await signOutFromSupabase();
        }

        setCustomerState(null);
        setStatus("signedOut");
      },

      async resetDemo() {
        await authService.resetDemo();
        setCustomerState(null);
        setStatus("signedOut");
      },

      setCustomer(next) {
        setCustomerState(next);
      },
    }),
    [status, customer],
  );

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);

  if (!ctx) {
    throw new Error("useSession must be used inside <SessionProvider>.");
  }

  return ctx;
}

export function useCurrentCustomer(): Customer {
  const { customer } = useSession();

  if (!customer) {
    throw new Error(
      "useCurrentCustomer must be used inside the signed-in portal.",
    );
  }

  return customer;
}