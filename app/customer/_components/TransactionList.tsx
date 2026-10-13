import Link from "next/link";
import {
  formatCad,
  formatDate,
  formatEtb,
} from "../_lib/format";
import type { Transaction } from "../_lib/types";
import { StatusBadge } from "./ui/StatusBadge";

function receiptHref(t: Transaction) {
  return `/customer/transactions/${encodeURIComponent(t.id)}`;
}

/**
 * Transaction history.
 *
 * Cards are shown below the xl breakpoint.
 * A full table is shown on wide screens.
 */
export function TransactionList({
  transactions,
  variant = "full",
}: {
  transactions: Transaction[];
  /** "compact" hides rate/fee columns on the dashboard. */
  variant?: "full" | "compact";
}) {
  const full = variant === "full";

  return (
    <div className="min-w-0">
      {/* Cards */}
      <ul
        className={`grid gap-3 ${
          full ? "md:grid-cols-2 xl:hidden" : ""
        }`}
      >
        {transactions.map((t) => (
          <li
            key={t.id}
            className="min-w-0"
          >
            <Link
              href={receiptHref(t)}
              className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">
                    {t.recipient.displayName}
                  </p>

                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                    <span className="font-mono">
                      {t.reference}
                    </span>

                    <span aria-hidden="true">
                      ·
                    </span>

                    <span>
                      {formatDate(t.createdAt)}
                    </span>
                  </p>
                </div>

                <StatusBadge
                  status={t.status}
                />
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                <div className="min-w-0">
                  <dt className="text-xs text-slate-500">
                    You sent
                  </dt>

                  <dd className="font-medium tabular-nums text-slate-900">
                    {formatCad(
                      t.sendAmountCad,
                    )}
                  </dd>
                </div>

                <div className="min-w-0 text-right">
                  <dt className="text-xs text-slate-500">
                    Recipient gets
                  </dt>

                  <dd className="break-words font-medium tabular-nums text-slate-900">
                    {formatEtb(
                      t.receiveAmountEtb,
                    )}
                  </dd>
                </div>

                {full && (
                  <>
                    <div className="min-w-0">
                      <dt className="text-xs text-slate-500">
                        Rate
                      </dt>

                      <dd className="tabular-nums text-slate-700">
                        {t.exchangeRate.toFixed(
                          2,
                        )}{" "}
                        ETB
                      </dd>
                    </div>

                    <div className="min-w-0 text-right">
                      <dt className="text-xs text-slate-500">
                        Fee
                      </dt>

                      <dd className="tabular-nums text-slate-700">
                        {formatCad(
                          t.feeCad,
                        )}
                      </dd>
                    </div>
                  </>
                )}
              </dl>

              <div className="mt-3 flex items-center justify-end border-t border-slate-100 pt-3 text-sm">
                <span className="font-medium text-blue-700">
                  View receipt →
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {/* Wide-screen table */}
      {full && (
        <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:block">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Transaction history
            </caption>

            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 font-semibold"
                >
                  Reference
                </th>

                <th
                  scope="col"
                  className="px-4 py-3 font-semibold"
                >
                  Date
                </th>

                <th
                  scope="col"
                  className="px-4 py-3 font-semibold"
                >
                  Recipient
                </th>

                <th
                  scope="col"
                  className="px-4 py-3 text-right font-semibold"
                >
                  CAD sent
                </th>

                <th
                  scope="col"
                  className="px-4 py-3 text-right font-semibold"
                >
                  ETB received
                </th>

                <th
                  scope="col"
                  className="px-4 py-3 text-right font-semibold"
                >
                  Rate
                </th>

                <th
                  scope="col"
                  className="px-4 py-3 text-right font-semibold"
                >
                  Fee
                </th>

                <th
                  scope="col"
                  className="px-4 py-3 font-semibold"
                >
                  Status
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {transactions.map((t) => (
                <tr
                  key={t.id}
                  className="hover:bg-slate-50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={receiptHref(t)}
                      className="font-mono text-xs font-medium text-blue-700 hover:underline"
                    >
                      {t.reference}
                    </Link>
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {formatDate(
                      t.createdAt,
                    )}
                  </td>

                  <td className="px-4 py-3 font-medium text-slate-900">
                    {
                      t.recipient
                        .displayName
                    }
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                    {formatCad(
                      t.sendAmountCad,
                    )}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                    {formatEtb(
                      t.receiveAmountEtb,
                    )}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-600">
                    {t.exchangeRate.toFixed(
                      2,
                    )}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-600">
                    {formatCad(
                      t.feeCad,
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <StatusBadge
                      status={t.status}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}