"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authService } from "./services/auth-service";
import { customerData } from "./services/data-service";
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
  /** Replace the cached customer after a profile update. */
  setCustomer(customer: Customer): void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Demo session provider. In production this wraps Supabase Auth's session
 * listener instead of localStorage.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [customer, setCustomerState] = useState<Customer | null>(null);

  const loadCustomer = useCallback(async (customerId: string) => {
    const profile = await customerData.getProfile(customerId);
    setCustomerState(profile);
    setStatus(profile ? "signedIn" : "signedOut");
  }, []);

  useEffect(() => {
    let cancelled = false;
    authService.getSession().then(async (session) => {
      if (cancelled) return;
      if (!session) {
        setStatus("signedOut");
        return;
      }
      const profile = await customerData.getProfile(session.customerId);
      if (cancelled) return;
      setCustomerState(profile);
      setStatus(profile ? "signedIn" : "signedOut");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      customer,
      async signIn(email, password) {
        const session = await authService.signIn(email, password);
        await loadCustomer(session.customerId);
      },
      async signInWithDemoAccount() {
        const session = await authService.signInWithDemoAccount();
        await loadCustomer(session.customerId);
      },
      async signUp(input) {
        const { session } = await authService.signUp(input);
        await loadCustomer(session.customerId);
      },
      async signOut() {
        await authService.signOut();
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
    [status, customer, loadCustomer],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>.");
  return ctx;
}

/**
 * For pages inside the signed-in portal. PortalShell only renders its
 * children once a customer is loaded, so this is always non-null there.
 */
export function useCurrentCustomer(): Customer {
  const { customer } = useSession();
  if (!customer) throw new Error("useCurrentCustomer must be used inside the signed-in portal.");
  return customer;
}
