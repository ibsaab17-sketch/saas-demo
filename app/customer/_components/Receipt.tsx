import type { ReactNode } from "react";
import {
  formatCad,
  formatDateTime,
  formatEtb,
  formatRate,
  maskAccountNumber,
} from "../_lib/format";
import type { Transaction } from "../_lib/types";
import { BrandMark } from "./BrandLogo";
import { StatusBadge } from "./ui/StatusBadge";

function Row({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2.5">
      <dt className="text-sm text-slate-600">
        {label}
      </dt>

      <dd
        className={`text-right text-sm tabular-nums ${
          strong
            ? "text-base font-bold text-slate-900"
            : "font-medium text-slate-900"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function formatBankName(bankName: string) {
  const banks: Record<string, string> = {
    "demo-cbe": "Commercial Bank of Ethiopia",
    "demo-awash": "Awash Bank",
    "demo-dashen": "Dashen Bank",
    "demo-boa": "Bank of Abyssinia",
    "demo-coop": "Cooperative Bank of Oromia",
  };

  return banks[bankName] ?? bankName ?? "—";
}

/**
 * Printable transfer receipt.
 */
export function Receipt({
  transaction: t,
}: {
  transaction: Transaction;
}) {
  return (
    <article
      aria-label={`Receipt ${t.reference}`}
      className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none"
    >
      <header className="relative flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <BrandMark className="h-10 w-10" />

          <div className="min-w-0">
            <p className="text-lg font-bold text-slate-900">
              BusinessFlow
            </p>

            <p className="text-xs text-slate-500">
              Transfer receipt
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={t.status} />
        </div>
      </header>

      <div className="relative grid gap-6 px-5 py-5 sm:px-8 md:grid-cols-2">
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Transfer details
          </h2>

          <dl className="mt-1 divide-y divide-slate-100">
            <Row
              label="Reference number"
              value={
                <span className="font-mono">
                  {t.reference}
                </span>
              }
            />

            <Row
              label="Date"
              value={formatDateTime(t.createdAt)}
            />

            <Row
              label="Customer"
              value={t.customerName}
            />

            <Row
              label="Processing"
              value="Handled by the business"
            />

            <Row
              label="Status"
              value={t.status}
            />
          </dl>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Recipient
          </h2>

          <dl className="mt-1 divide-y divide-slate-100">
            <Row
              label="Recipient"
              value={t.recipient.displayName}
            />

            <Row
              label="Destination bank"
              value={formatBankName(
                t.recipient.bankName,
              )}
            />

            <Row
              label="Account number"
              value={maskAccountNumber(
                t.recipient.accountLast4,
              )}
            />

            <Row
              label="Sending reason"
              value={t.recipient.sendingReason}
            />
          </dl>
        </section>

        <section className="md:col-span-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Amounts
          </h2>

          <dl className="mt-1 divide-y divide-slate-100 rounded-xl bg-slate-50 px-4">
            <Row
              label="CAD sent"
              value={formatCad(t.sendAmountCad)}
            />

            <Row
              label="Exchange rate"
              value={formatRate(t.exchangeRate)}
            />

            <Row
              label="Transfer fee"
              value={formatCad(t.feeCad)}
            />

            <Row
              label="Total paid"
              value={formatCad(t.totalCad)}
              strong
            />

            <Row
              label="ETB received"
              value={formatEtb(
                t.receiveAmountEtb,
              )}
              strong
            />
          </dl>
        </section>
      </div>

      <footer className="relative border-t border-slate-200 px-5 py-4 text-xs text-slate-500 sm:px-8">
        <p>
          Keep this receipt for your records.
        </p>
      </footer>
    </article>
  );
}