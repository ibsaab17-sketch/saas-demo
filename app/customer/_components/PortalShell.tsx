"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { initials } from "../_lib/format";
import { useSession } from "../_lib/session-context";
import { BrandLogo } from "./BrandLogo";
import { DemoBanner } from "./ui/DemoBanner";
import { Spinner } from "./ui/Spinner";

const NAV_ITEMS = [
  { href: "/customer/dashboard", label: "Home", icon: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  { href: "/customer/send", label: "Send Money", icon: "M4 12h13M13 6l6 6-6 6" },
  { href: "/customer/transactions", label: "My Transactions", icon: "M5 4h14v16H5zM9 9h6M9 13h6M9 17h3" },
  { href: "/customer/account", label: "My Account", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" },
];

function NavIcon({ d }: { d: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <ul className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm font-medium transition ${
                active ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <NavIcon d={item.icon} />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Signed-in customer layout: desktop sidebar, mobile compact header with a
 * slide-out menu, and a demo-session guard.
 */
export function PortalShell({ children }: { children: ReactNode }) {
  const { status, customer, signOut } = useSession();
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (status === "signedOut" && !signingOut) router.replace("/customer/login");
  }, [status, signingOut, router]);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  async function handleLogout() {
    setMenuOpen(false);
    setSigningOut(true);
    await signOut();
    router.replace("/customer");
  }

  if (status !== "signedIn" || !customer) {
    return (
      <div className="flex min-h-[60vh] flex-1 items-center justify-center text-blue-600">
        <Spinner label={status === "signedOut" ? "Redirecting to sign in…" : "Loading your portal…"} />
      </div>
    );
  }

  const fullName = `${customer.firstName} ${customer.lastName}`;

  const userBlock = (
    <div className="flex min-w-0 items-center gap-3">
      <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold text-white">
        {initials(customer.firstName, customer.lastName)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-white">{fullName}</span>
        <span className="block truncate text-xs text-slate-400">{customer.email}</span>
      </span>
    </div>
  );

  const logoutButton = (
    <button
      type="button"
      onClick={handleLogout}
      disabled={signingOut}
      className="flex min-h-12 w-full items-center gap-3 rounded-xl px-4 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:opacity-60"
    >
      <NavIcon d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />
      {signingOut ? "Signing out…" : "Logout"}
    </button>
  );

  return (
    <div className="flex min-h-screen flex-1 bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-slate-950 lg:flex print:hidden">
        <div className="border-b border-slate-800 px-5 py-5">
          <BrandLogo href="/customer/dashboard" tone="light" />
        </div>
        <nav aria-label="Customer portal" className="flex-1 overflow-y-auto p-4">
          <NavLinks pathname={pathname} />
        </nav>
        <div className="space-y-3 border-t border-slate-800 p-4">
          {userBlock}
          {logoutButton}
        </div>
      </aside>

      {/* Mobile slide-out menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden print:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-slate-950/60"
            onClick={() => setMenuOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="relative z-10 flex h-full w-[min(85vw,20rem)] flex-col bg-slate-950 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 px-4 py-4">
              <BrandLogo href="/customer/dashboard" tone="light" />
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-2xl text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                ×
              </button>
            </div>
            <nav aria-label="Customer portal" className="flex-1 overflow-y-auto p-4">
              <NavLinks pathname={pathname} onNavigate={() => setMenuOpen(false)} />
            </nav>
            <div className="space-y-3 border-t border-slate-800 p-4">
              {userBlock}
              {logoutButton}
            </div>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <DemoBanner compact />
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2.5 lg:hidden print:hidden">
          <BrandLogo href="/customer/dashboard" subtitle={null} />
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-xl text-slate-700 hover:bg-slate-50"
          >
            ☰
          </button>
        </header>
        <main id="main" className="mx-auto w-full min-w-0 max-w-5xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-600 sm:text-base">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
