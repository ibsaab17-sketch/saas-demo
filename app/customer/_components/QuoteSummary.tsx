import { formatCad, formatEtb, formatRate } from "../_lib/format";
import type { Quote } from "../_lib/types";

interface Row {
  label: string;
  value: string;
  emphasis?: boolean;
}

export function QuoteSummary({
  quote,
  title = "Quote summary",
  compact = false,
}: {
  quote: Quote;
  title?: string | null;
  compact?: boolean;
}) {
  const rows: Row[] = [
    {
      label: "You send",
      value: formatCad(quote.sendAmountCad),
    },
    {
      label: "Exchange rate",
      value: formatRate(quote.exchangeRate),
    },
    {
      label: "Transfer fee",
      value: formatCad(quote.feeCad),
    },
    {
      label: "Total you pay",
      value: formatCad(quote.totalCad),
      emphasis: true,
    },
    {
      label: "Recipient gets",
      value: formatEtb(quote.receiveAmountEtb),
      emphasis: true,
    },
  ];

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-slate-50 ${
        compact ? "p-3" : "p-4"
      }`}
    >
      {title && (
        <h3 className="mb-2 text-sm font-semibold text-slate-900">
          {title}
        </h3>
      )}

      <dl className="divide-y divide-slate-200 text-sm">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2"
          >
            <dt className="text-slate-600">
              {row.label}
            </dt>

            <dd
              className={`text-right tabular-nums ${
                row.emphasis
                  ? "font-semibold text-slate-900"
                  : "text-slate-800"
              }`}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-2 text-xs text-slate-500">
        The exchange rate and transfer fee are set by the business.
      </p>
    </div>
  );
}