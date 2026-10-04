"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CustomerAccessPanel } from "./_components/CustomerAccessPanel";
import { PublicFooter, PublicHeader } from "./_components/PublicHeader";
import { quoteFromInput, RateCalculator } from "./_components/RateCalculator";
import { Button } from "./_components/ui/Button";
import { DemoBanner } from "./_components/ui/DemoBanner";
import { DEFAULT_SEND_AMOUNT_CAD } from "./_lib/config";
import { useSession } from "./_lib/session-context";
import type { DeliverySpeed } from "./_lib/types";

export default function CustomerLandingPage() {
  const router = useRouter();
  const { status } = useSession();
  const [amountText, setAmountText] = useState(String(DEFAULT_SEND_AMOUNT_CAD));
  const [speed, setSpeed] = useState<DeliverySpeed>("standard");
  const [showErrors, setShowErrors] = useState(false);

  function handleContinue() {
    const { error, amount } = quoteFromInput(amountText, speed);
    if (error) {
      setShowErrors(true);
      return;
    }
    const target = `/customer/send?amount=${encodeURIComponent(amount.toFixed(2))}&speed=${speed}`;
    if (status === "signedIn") router.push(target);
    else router.push(`/customer/login?next=${encodeURIComponent(target)}`);
  }

  return (
    <>
      <DemoBanner />
      <PublicHeader />
      <main className="flex-1">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 sm:py-10 lg:grid-cols-2 lg:gap-10 lg:py-14">
          {/* LEFT: calculator (second on mobile so the service explanation reads first) */}
          <section
            aria-labelledby="calculator-heading"
            className="order-2 min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:order-1"
          >
            <RateCalculator
              heading={
                <div>
                  <h2 id="calculator-heading" className="text-xl font-bold text-slate-900">
                    CAD → ETB transfer calculator
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">Update the amount to see your quote instantly.</p>
                </div>
              }
              amountText={amountText}
              onAmountTextChange={(v) => {
                setAmountText(v);
                setShowErrors(false);
              }}
              deliverySpeed={speed}
              onDeliverySpeedChange={setSpeed}
              showErrors={showErrors}
              footer={
                <Button size="lg" fullWidth onClick={handleContinue}>
                  {status === "signedIn" ? "Continue to Send Money" : "Sign in to send"}
                </Button>
              }
            />
          </section>

          {/* RIGHT: customer access */}
          <section aria-label="Customer access" className="order-1 min-w-0 lg:order-2 lg:pt-4">
            <CustomerAccessPanel />
          </section>
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
