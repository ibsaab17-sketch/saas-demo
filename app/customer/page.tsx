"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { CustomerAccessPanel } from "./_components/CustomerAccessPanel";
import {
  PublicFooter,
  PublicHeader,
} from "./_components/PublicHeader";
import { Button } from "./_components/ui/Button";
import { DEFAULT_SEND_AMOUNT_CAD } from "./_lib/config";
import {
  formatCad,
} from "./_lib/format";
import {
  parseAmountInput,
  validateSendAmount,
} from "./_lib/quote";
import { useSession } from "./_lib/session-context";

export default function CustomerLandingPage() {
  const router = useRouter();
  const { status } = useSession();

  const [amountText, setAmountText] = useState(
    String(DEFAULT_SEND_AMOUNT_CAD),
  );

  const [showErrors, setShowErrors] =
    useState(false);

  const amount = parseAmountInput(amountText);

  const amountError = validateSendAmount(
    amount,
    0,
    false,
  );

  const visibleError =
    showErrors ||
    (amountText !== "" &&
      amountError &&
      !amountError.startsWith("Enter"))
      ? amountError
      : null;

  function handleContinue() {
    if (amountError) {
      setShowErrors(true);
      return;
    }

    const target =
      `/customer/send?amount=${encodeURIComponent(
        amount.toFixed(2),
      )}`;

    if (status === "signedIn") {
      router.push(target);
    } else {
      router.push(
        `/customer/login?next=${encodeURIComponent(
          target,
        )}`,
      );
    }
  }

  return (
    <>
      <PublicHeader />

      <main className="flex-1">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 sm:py-10 lg:grid-cols-2 lg:gap-10 lg:py-14">
          <section
            aria-labelledby="transfer-heading"
            className="order-2 min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:order-1"
          >
            <div>
              <h2
                id="transfer-heading"
                className="text-xl font-bold text-slate-900"
              >
                Start a CAD to ETB transfer
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Enter the amount you want to
                send. Your current exchange
                rate and transfer fee will be
                shown after you sign in.
              </p>
            </div>

            <div className="mt-5">
              <label
                htmlFor="send-amount"
                className="mb-1.5 block text-sm font-medium text-slate-800"
              >
                You send
              </label>

              <div
                className={`flex min-h-14 items-center overflow-hidden rounded-xl border bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-500/40 ${
                  visibleError
                    ? "border-red-400"
                    : "border-slate-300 focus-within:border-blue-500"
                }`}
              >
                <span
                  aria-hidden="true"
                  className="pl-4 text-lg text-slate-500"
                >
                  $
                </span>

                <input
                  id="send-amount"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={amountText}
                  onChange={(event) => {
                    setAmountText(
                      event.target.value.replace(
                        /[^0-9.,]/g,
                        "",
                      ),
                    );

                    setShowErrors(false);
                  }}
                  aria-invalid={
                    visibleError
                      ? true
                      : undefined
                  }
                  placeholder="0.00"
                  className="min-w-0 flex-1 bg-transparent px-2 py-3 text-2xl font-semibold tabular-nums text-slate-900 focus:outline-none"
                />

                <span className="mr-2 shrink-0 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-800">
                  CAD
                </span>
              </div>

              <p
                className={`mt-1.5 text-sm ${
                  visibleError
                    ? "text-red-700"
                    : "text-slate-500"
                }`}
              >
                {visibleError ??
                  "Enter the amount you want to send."}
              </p>
            </div>

            <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm font-medium text-blue-950">
                Current pricing
              </p>

              <p className="mt-1 text-sm text-blue-800">
                Sign in to see the exchange
                rate and transfer fee set by
                your business.
              </p>
            </div>

            <Button
              size="lg"
              fullWidth
              className="mt-5"
              onClick={handleContinue}
            >
              {status === "signedIn"
                ? "Continue to transfer"
                : "Sign in to continue"}
            </Button>

            {Number.isFinite(amount) &&
              amount > 0 &&
              !visibleError && (
                <p className="mt-3 text-center text-xs text-slate-500">
                  Transfer amount:{" "}
                  {formatCad(amount)}
                </p>
              )}
          </section>

          <section
            aria-label="Customer access"
            className="order-1 min-w-0 lg:order-2 lg:pt-4"
          >
            <CustomerAccessPanel />
          </section>
        </div>
      </main>

      <PublicFooter />
    </>
  );
}