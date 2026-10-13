"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "../../_components/PortalShell";
import { Button } from "../../_components/ui/Button";
import { Card } from "../../_components/ui/Card";
import { formatDate, initials } from "../../_lib/format";
import {
  useCurrentCustomer,
  useSession,
} from "../../_lib/session-context";

export default function AccountPage() {
  const customer = useCurrentCustomer();
  const { signOut } = useSession();
  const router = useRouter();

  const [signingOut, setSigningOut] =
    useState(false);

  async function handleLogout() {
    setSigningOut(true);

    try {
      await signOut();
      router.replace("/customer");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <>
      <PageHeader
        title="My Account"
        description="View your account information and manage your session."
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Card title="Personal information">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <span
                aria-hidden="true"
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white"
              >
                {initials(
                  customer.firstName,
                  customer.lastName,
                )}
              </span>

              <dl className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2">
                <div className="min-w-0">
                  <dt className="text-xs text-slate-500">
                    Full name
                  </dt>

                  <dd className="break-words font-medium text-slate-900">
                    {customer.firstName}{" "}
                    {customer.lastName}
                  </dd>
                </div>

                <div className="min-w-0">
                  <dt className="text-xs text-slate-500">
                    Email
                  </dt>

                  <dd className="break-all font-medium text-slate-900">
                    {customer.email}
                  </dd>
                </div>

                <div className="min-w-0">
                  <dt className="text-xs text-slate-500">
                    Phone
                  </dt>

                  <dd className="font-medium text-slate-900">
                    {customer.phone}
                  </dd>
                </div>

                <div className="min-w-0">
                  <dt className="text-xs text-slate-500">
                    Member since
                  </dt>

                  <dd className="font-medium text-slate-900">
                    {formatDate(
                      customer.createdAt,
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </Card>
        </div>

        <div>
          <Card title="Session">
            <p className="text-sm text-slate-600">
              Sign out securely when you are
              finished using your account.
            </p>

            <Button
              variant="secondary"
              fullWidth
              className="mt-4"
              onClick={handleLogout}
              loading={signingOut}
              loadingText="Signing out…"
              disabled={signingOut}
            >
              Sign out
            </Button>
          </Card>
        </div>
      </div>
    </>
  );
}