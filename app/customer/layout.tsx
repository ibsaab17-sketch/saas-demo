import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SessionProvider } from "./_lib/session-context";

export const metadata: Metadata = {
  title: {
    default: "BusinessFlow Customer Portal (Demo)",
    template: "%s · BusinessFlow Customer Portal",
  },
  description:
    "Demo customer portal for sending money from Canada to Ethiopia. All rates, accounts and transfers are simulated.",
  robots: { index: false, follow: false },
};

export default function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <div className="flex min-h-screen flex-1 flex-col bg-slate-50 font-sans text-slate-900 antialiased">
        {children}
      </div>
    </SessionProvider>
  );
}
