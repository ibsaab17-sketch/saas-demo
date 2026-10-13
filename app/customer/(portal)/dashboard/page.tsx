"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PageHeader } from "../../_components/PortalShell";
import { RecipientSummary } from "../../_components/RecipientPicker";
import { TransactionList } from "../../_components/TransactionList";
import { Alert } from "../../_components/ui/Alert";
import { ButtonLink } from "../../_components/ui/Button";
import { Card } from "../../_components/ui/Card";
import { EmptyState } from "../../_components/ui/EmptyState";
import { LoadingBlock } from "../../_components/ui/Spinner";
import { StatusBadge } from "../../_components/ui/StatusBadge";

import {
  formatRate,
  recipientDisplayName,
} from "../../_lib/format";

import { TRANSFER_STATUSES } from "../../_lib/reference-data";
import { useCurrentCustomer } from "../../_lib/session-context";
import { customerData } from "../../_lib/services/data-service";
import { rateService } from "../../_lib/services/rate-service";

import type {
  Bank,
  Recipient,
  Transaction,
} from "../../_lib/types";

interface DashboardData {
  transactions: Transaction[];
  recipients: Recipient[];
  banks: Bank[];
  rate: number;
}

interface TransactionListResponse {
  transactions?: Transaction[];
  error?: string;
}

export default function DashboardPage() {
  const customer = useCurrentCustomer();

  const [data, setData] =
    useState<DashboardData | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        setError(null);

        /*
         * Transactions come from the real authenticated
         * customer transaction API.
         */
        const transactionResponse =
          await fetch(
            "/api/customer/transactions",
            {
              method: "GET",
              cache: "no-store",
            },
          );

        let transactionResult:
          TransactionListResponse;

        try {
          transactionResult =
            (await transactionResponse.json()) as TransactionListResponse;
        } catch {
          throw new Error(
            "The server returned an invalid transaction response.",
          );
        }

        if (!transactionResponse.ok) {
          throw new Error(
            transactionResult.error ??
              "Could not load transactions.",
          );
        }

        /*
         * Recipients are already backed by Supabase.
         * Banks and the current business rate use the
         * existing services.
         */
        const [
          recipients,
          banks,
          rate,
        ] = await Promise.all([
          customerData.listRecipients(
            customer.id,
          ),
          customerData.listBanks(),
          rateService.getCurrentRate(),
        ]);

        if (!cancelled) {
          setData({
            transactions:
              transactionResult.transactions ??
              [],
            recipients,
            banks,
            rate: rate.rate,
          });
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load your dashboard.",
          );
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [customer.id]);

  const counts =
    TRANSFER_STATUSES.map(
      (status) => ({
        status,
        count:
          data?.transactions.filter(
            (transaction) =>
              transaction.status ===
              status,
          ).length ?? 0,
      }),
    );

  return (
    <>
      <PageHeader
        title={`Welcome, ${customer.firstName}`}
        description="Manage your transfer requests and track their progress."
      />

      {/* Quick send + rate */}
      <div className="grid gap-4 md:grid-cols-5">
        <div className="min-w-0 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-5 text-white shadow-sm sm:p-6 md:col-span-3">
          <p className="text-sm font-medium text-blue-100">
            Quick send
          </p>

          <p className="mt-1 text-xl font-bold sm:text-2xl">
            Ready to start a transfer?
          </p>

          <p className="mt-1 text-sm text-blue-100">
            Get a quote, choose a recipient,
            provide payment proof, and submit
            your transfer request.
          </p>

          <div className="mt-5 flex flex-col gap-3 min-[420px]:flex-row">
            <Link
              href="/customer/send"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-5 font-semibold text-blue-700 shadow-sm hover:bg-blue-50"
            >
              Start transfer
            </Link>

            <Link
              href="/customer/recipients"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/40 px-5 font-semibold text-white hover:bg-white/10"
            >
              Manage recipients
            </Link>
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 md:col-span-2">
          <p className="text-sm font-medium text-slate-500">
            Current rate
          </p>

          <p className="mt-1 break-words text-2xl font-bold tabular-nums text-slate-900">
            {data
              ? formatRate(data.rate)
              : "—"}
          </p>

          <p className="mt-2 inline-flex rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900">
            Business rate
          </p>
        </div>
      </div>

      {error && (
        <Alert
          tone="error"
          className="mt-6"
        >
          {error}
        </Alert>
      )}

      {/* Status summary */}
      <section
        aria-labelledby="status-heading"
        className="mt-6"
      >
        <h2
          id="status-heading"
          className="sr-only"
        >
          Transfer status summary
        </h2>

        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {counts.map(
            ({ status, count }) => (
              <li
                key={status}
                className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <StatusBadge
                  status={status}
                />

                <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                  {data
                    ? count
                    : "—"}
                </p>

                <p className="text-xs text-slate-500">
                  {count === 1
                    ? "transfer"
                    : "transfers"}
                </p>
              </li>
            ),
          )}
        </ul>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          title="Recent transactions"
          action={
            <Link
              href="/customer/transactions"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-blue-700 hover:underline"
            >
              View all
            </Link>
          }
        >
          {!data && !error ? (
            <LoadingBlock label="Loading transactions…" />
          ) : data &&
            data.transactions.length ===
              0 ? (
            <EmptyState
              title="No transfers yet"
              description="Your transfer requests will appear here."
              action={
                <ButtonLink href="/customer/send">
                  Start your first transfer
                </ButtonLink>
              }
            />
          ) : data ? (
            <TransactionList
              transactions={data.transactions.slice(
                0,
                3,
              )}
              variant="compact"
            />
          ) : null}
        </Card>

        <Card
          title="Saved recipients"
          action={
            <Link
              href="/customer/recipients"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-blue-700 hover:underline"
            >
              Manage
            </Link>
          }
        >
          {!data && !error ? (
            <LoadingBlock label="Loading recipients…" />
          ) : data &&
            data.recipients.length ===
              0 ? (
            <EmptyState
              title="No recipients yet"
              description="Add a recipient to start a transfer request."
              action={
                <ButtonLink
                  href="/customer/recipients?add=1"
                  variant="secondary"
                >
                  Add recipient
                </ButtonLink>
              }
            />
          ) : data ? (
            <ul className="divide-y divide-slate-100">
              {data.recipients
                .slice(0, 4)
                .map((recipient) => (
                  <li
                    key={recipient.id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <RecipientSummary
                      recipient={
                        recipient
                      }
                      banks={
                        data.banks
                      }
                    />

                    <Link
                      href={`/customer/send?recipient=${encodeURIComponent(
                        recipient.id,
                      )}`}
                      className="inline-flex min-h-11 shrink-0 items-center rounded-lg px-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                      aria-label={`Start transfer to ${recipientDisplayName(
                        recipient,
                      )}`}
                    >
                      Send
                    </Link>
                  </li>
                ))}
            </ul>
          ) : null}
        </Card>
      </div>
    </>
  );
}