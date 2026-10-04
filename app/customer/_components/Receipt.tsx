import type { ReactNode } from "react";
import { formatCad, formatDateTime, formatEtb, formatRate, maskAccountNumber } from "../_lib/format";
import { getFeeOption } from "../_lib/quote";
import type { Transaction } from "../_lib/types";
import { BrandMark } from "./BrandLogo";
import { StatusBadge } from "./ui/StatusBadge";

function Row({ label, value, strong = false }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2.5">
      <dt className="text-sm text-slate-600">{label}</dt>
      <dd className={`text-right text-sm tabular-nums ${strong ? "text-base font-bold text-slate-900" : "font-medium text-slate-900"}`}>
        {value}
      </dd>
    </div>
  );
}

/** Printable transfer receipt. Always watermarked as a DEMO for synthetic records. */
export function Receipt({ transaction: t }: { transaction: Transaction }) {
  const fee = getFeeOption(t.deliverySpeed);
  return (
    <article
      aria-label={`Receipt ${t.reference}`}
      className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none"
    >
      {t.isDemo && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
          <span className="-rotate-12 select-none whitespace-nowrap text-7xl font-black tracking-widest text-amber-500/10 sm:text-9xl">
            DEMO
          </span>
        </div>
      )}

      <header className="relative flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <BrandMark className="h-10 w-10" />
          <div className="min-w-0">
            <p className="text-lg font-bold text-slate-900">BusinessFlow</p>
            <p className="text-xs text-slate-500">Transfer receipt</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={t.status} />
          {t.isDemo && (
            <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-bold uppercase tracking-wide text-amber-900">
              Demo · Simulated transaction
            </span>
          )}
        </div>
      </header>

      <div className="relative grid gap-6 px-5 py-5 sm:px-8 md:grid-cols-2">
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Transfer details</h2>
          <dl className="mt-1 divide-y divide-slate-100">
            <Row label="Reference number" value={<span className="font-mono">{t.reference}</span>} />
            <Row label="Date" value={formatDateTime(t.createdAt)} />
            <Row label="Customer" value={t.customerName} />
            <Row label="Delivery" value={`${fee.label} — ${fee.description}`} />
            <Row label="Status" value={t.status} />
          </dl>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recipient</h2>
          <dl className="mt-1 divide-y divide-slate-100">
            <Row label="Recipient" value={t.recipient.displayName} />
            <Row label="Destination bank" value={t.recipient.bankName} />
            <Row label="Account number" value={maskAccountNumber(t.recipient.accountLast4)} />
            <Row label="Sending reason" value={t.recipient.sendingReason} />
          </dl>
        </section>

        <section className="md:col-span-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Amounts</h2>
          <dl className="mt-1 divide-y divide-slate-100 rounded-xl bg-slate-50 px-4">
            <Row label="CAD sent" value={formatCad(t.sendAmountCad)} />
            <Row label="Exchange rate" value={formatRate(t.exchangeRate)} />
            <Row label="Transfer fee" value={formatCad(t.feeCad)} />
            <Row label="Total paid" value={formatCad(t.totalCad)} strong />
            <Row label="ETB received" value={formatEtb(t.receiveAmountEtb)} strong />
          </dl>
        </section>
      </div>

      <footer className="relative border-t border-slate-200 px-5 py-4 text-xs text-slate-500 sm:px-8">
        {t.isDemo ? (
          <p>
            <strong className="text-amber-800">DEMO RECEIPT.</strong> This is a simulated transaction
            created for UI testing. No money was collected or delivered, and this document is not
            proof of payment.
          </p>
        ) : (
          <p>Keep this receipt for your records.</p>
        )}
      </footer>
    </article>
  );
}
