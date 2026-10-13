import { ButtonLink } from "./ui/Button";

const points = [
  {
    title: "Transparent pricing",
    body: "See the exchange rate, fee, and expected ETB amount before submitting your transfer request.",
  },
  {
    title: "Saved recipients",
    body: "Keep family and business recipients ready for future transfer requests.",
  },
  {
    title: "Track every transfer",
    body: "Follow the status of your transfer requests and keep printable receipts.",
  },
];

export function CustomerAccessPanel() {
  return (
    <div className="min-w-0 space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          BusinessFlow Customer Portal
        </p>

        <h1 className="mt-2 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
          Send money from Canada to Ethiopia
        </h1>

        <p className="mt-3 text-base text-slate-600">
          Get a clear CAD → ETB quote, choose a recipient,
          submit your transfer request, and track its progress
          in one place.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ButtonLink
          href="/customer/login"
          size="lg"
          fullWidth
        >
          Sign in
        </ButtonLink>

        <ButtonLink
          href="/customer/register"
          size="lg"
          variant="secondary"
          fullWidth
        >
          Create account
        </ButtonLink>
      </div>

      <ul className="space-y-3">
        {points.map((point) => (
          <li
            key={point.title}
            className="flex gap-3"
          >
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700"
            >
              ✓
            </span>

            <span className="min-w-0">
              <span className="block font-semibold text-slate-900">
                {point.title}
              </span>

              <span className="block text-sm text-slate-600">
                {point.body}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-slate-700">
        <strong className="text-slate-900">
          How it works:
        </strong>{" "}
        Submit your transfer details and payment proof through
        BusinessFlow. The business verifies your payment and
        processes the transfer separately while you track the
        status here.
      </div>
    </div>
  );
}