import { DEMO_CUSTOMER_ID } from "../mock-data";
import type { Customer, RegistrationInput } from "../types";
import { isValidEmail, passwordProblems } from "../validation";
import { delay, readDemoStore, resetDemoStore, writeDemoStore } from "./data-service";

/**
 * AuthService — demo sign-in/sign-up.
 *
 * THIS IS NOT REAL AUTHENTICATION. Passwords are checked for format only and
 * are never stored or transmitted. Replace `demoAuthService` with a Supabase
 * Auth implementation in production.
 */
export interface DemoSession {
  customerId: string;
  signedInAt: string;
}

export interface AuthService {
  getSession(): Promise<DemoSession | null>;
  signIn(email: string, password: string): Promise<DemoSession>;
  signInWithDemoAccount(): Promise<DemoSession>;
  signUp(input: RegistrationInput): Promise<{ session: DemoSession; customer: Customer }>;
  signOut(): Promise<void>;
  /** Demo only: restore synthetic fixtures and sign out. */
  resetDemo(): Promise<void>;
}

const SESSION_KEY = "businessflow.customerPortal.demoSession.v1";

function saveSession(session: DemoSession | null): void {
  try {
    if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore storage failures in the demo.
  }
}

function loadSession(): DemoSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DemoSession;
    return typeof parsed.customerId === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function createSession(customerId: string): DemoSession {
  const session = { customerId, signedInAt: new Date().toISOString() };
  saveSession(session);
  return session;
}

export const demoAuthService: AuthService = {
  async getSession() {
    const session = loadSession();
    if (!session) return null;
    const exists = readDemoStore().customers.some((c) => c.id === session.customerId);
    if (!exists) {
      saveSession(null);
      return null;
    }
    return session;
  },

  async signIn(email, password) {
    await delay(700);
    if (!isValidEmail(email)) throw new Error("Enter a valid email address.");
    if (!password) throw new Error("Enter your password.");
    const customer = readDemoStore().customers.find(
      (c) => c.email.toLowerCase() === email.trim().toLowerCase(),
    );
    if (!customer) {
      throw new Error(
        "No demo account uses that email. Create an account or use the demo account.",
      );
    }
    // DEMO: the password is intentionally not verified or stored.
    return createSession(customer.id);
  },

  async signInWithDemoAccount() {
    await delay(500);
    const store = readDemoStore();
    if (!store.customers.some((c) => c.id === DEMO_CUSTOMER_ID)) {
      resetDemoStore();
    }
    return createSession(DEMO_CUSTOMER_ID);
  },

  async signUp(input) {
    await delay(900);
    const problem = passwordProblems(input.password);
    if (problem) throw new Error(problem);
    const store = readDemoStore();
    const email = input.email.trim();
    if (store.customers.some((c) => c.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("A demo account with that email already exists. Try signing in.");
    }
    const customer: Customer = {
      id: `demo-customer-${Date.now().toString(36)}`,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email,
      phone: input.phone.trim(),
      createdAt: new Date().toISOString(),
      notificationPreferences: {
        emailTransferUpdates: true,
        smsTransferUpdates: false,
        rateAlerts: false,
        marketing: false,
      },
      isDemo: true,
    };
    // SECURITY: input.password is deliberately NOT persisted anywhere.
    writeDemoStore({ ...store, customers: [...store.customers, customer] });
    return { session: createSession(customer.id), customer };
  },

  async signOut() {
    await delay(200);
    saveSession(null);
  },

  async resetDemo() {
    await delay(300);
    resetDemoStore();
    saveSession(null);
  },
};

export const authService: AuthService = demoAuthService;
