import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SessionProvider } from "./_lib/session-context";

export const metadata: Metadata = {
  title: {
    default: "BusinessFlow Customer Portal",
    template: "%s · BusinessFlow Customer Portal",
  },
  description:
    "BusinessFlow customer portal for managing transfer requests, recipients, payment proof, status updates, and receipts.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CustomerLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="flex min-h-screen flex-1 flex-col bg-slate-50 font-sans text-slate-900 antialiased">
        {children}
      </div>
    </SessionProvider>
  );
}