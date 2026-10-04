"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { PageHeader } from "../../_components/PortalShell";
import { QuoteSummary } from "../../_components/QuoteSummary";
import { quoteFromInput, RateCalculator } from "../../_components/RateCalculator";
import { RecipientForm } from "../../_components/RecipientForm";
import { bankNameFor, RecipientPicker } from "../../_components/RecipientPicker";
import { StepIndicator } from "../../_components/StepIndicator";
import { Alert } from "../../_components/ui/Alert";
import { Button, ButtonLink } from "../../_components/ui/Button";
import { Card } from "../../_components/ui/Card";
import { CheckboxField } from "../../_components/ui/FormField";
import { LoadingBlock } from "../../_components/ui/Spinner";
import { StatusBadge } from "../../_components/ui/StatusBadge";
import { DEFAULT_SEND_AMOUNT_CAD } from "../../_lib/config";
import { formatCad, formatEtb, maskAccountNumber, recipientDisplayName } from "../../_lib/format";
import { useCurrentCustomer } from "../../_lib/session-context";
import { customerData } from "../../_lib/services/data-service";
import type { Bank, DeliverySpeed, NewRecipientInput, Recipient, Transaction } from "../../_lib/types";

const STEPS = ["Amount", "Recipient", "Review", "Submitted"];

function initialAmount(raw: string | null): string {
  const n = raw ? Number.parseFloat(raw) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? String(n) : String(DEFAULT_SEND_AMOUNT_CAD);
}

function SendMoneyFlow() {
  const customer = useCurrentCustomer();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(0);
  const [amountText, setAmountText] = useState(() => initialAmount(searchParams.get("amount")));
  const [speed, setSpeed] = useState<DeliverySpeed>(() =>
    searchParams.get("speed") === "express" ? "express" : "standard",
  );
  const [showAmountErrors, setShowAmountErrors] = useState(false);

  const [recipients, setRecipients] = useState<Recipient[] | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [recipientId, setRecipientId] = useState<string | null>(() => searchParams.get("recipient"));
  const [addingRecipient, setAddingRecipient] = useState(false);
  const [recipientError, setRecipientError] = useState<string | null>(null);

  const [confirmed, setConfirmed] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<Transaction | null>(null);

  const headingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([customerData.listRecipients(customer.id), customerData.listBanks()])
      .then(([list, bankList]) => {
        if (cancelled) return;
        setRecipients(list);
        setBanks(bankList);
        setRecipientId((current) => (current && list.some((r) => r.id === current) ? current : null));
        if (list.length === 0) setAddingRecipient(true);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Could not load recipients.");
      });
    return () => {
      cancelled = true;
    };
  }, [customer.id]);

  function goTo(next: number) {
    setStep(next);
    headingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const { quote, error: amountError } = quoteFromInput(amountText, speed);
  const selectedRecipient = recipients?.find((r) => r.id === recipientId) ?? null;

  function continueFromAmount() {
    if (amountError) {
      setShowAmountErrors(true);
      return;
    }
    goTo(1);
  }

  function continueFromRecipient() {
    if (!selectedRecipient) {
      setRecipientError("Choose a recipient or add a new one.");
      return;
    }
    setRecipientError(null);
    goTo(2);
  }

  async function handleAddRecipient(input: NewRecipientInput) {
    const created = await customerData.addRecipient(customer.id, input);
    setRecipients((prev) => [created, ...(prev ?? [])]);
    setRecipientId(created.id);
    setAddingRecipient(false);
    setRecipientError(null);
    return created;
  }

  async function handleSubmit() {
    if (!confirmed) {
      setConfirmError("Please confirm the details before submitting.");
      return;
    }
    if (!selectedRecipient) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const txn = await customerData.createTransferRequest(customer.id, {
        recipientId: selectedRecipient.id,
        sendAmountCad: quote.sendAmountCad,
        deliverySpeed: speed,
      });
      setResult(txn);
      goTo(3);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "The demo transfer could not be created.");
    } finally {
      setSubmitting(false);
    }
  }

  function startOver() {
    setResult(null);
    setConfirmed(false);
    setAmountText(String(DEFAULT_SEND_AMOUNT_CAD));
    setShowAmountErrors(false);
    goTo(0);
  }

  return (
    <>
      <div ref={headingRef} className="scroll-mt-20">
        <PageHeader title="Send Money" description="Request a simulated CAD → ETB transfer in four steps." />
      </div>
      <div className="mb-6">
        <StepIndicator steps={STEPS} current={step} />
      </div>

      {/* STEP 1 — Amount */}
      {step === 0 && (
        <Card title="How much are you sending?">
          <div className="mx-auto max-w-xl">
            <RateCalculator
              amountText={amountText}
              onAmountTextChange={(v) => {
                setAmountText(v);
                setShowAmountErrors(false);
              }}
              deliverySpeed={speed}
              onDeliverySpeedChange={setSpeed}
              showErrors={showAmountErrors}
              footer={
                <Button size="lg" fullWidth onClick={continueFromAmount}>
                  Continue to recipient
                </Button>
              }
            />
          </div>
        </Card>
      )}

      {/* STEP 2 — Recipient */}
      {step === 1 && (
        <Card
          title="Who are you sending to?"
          description={`Sending ${formatCad(quote.sendAmountCad)} → ${formatEtb(quote.receiveAmountEtb)}`}
        >
          {loadError && <Alert tone="error" className="mb-4">{loadError}</Alert>}
          {!recipients && !loadError ? (
            <LoadingBlock label="Loading recipients…" />
          ) : addingRecipient ? (
            <div>
              <h3 className="mb-4 text-base font-semibold text-slate-900">Add new recipient</h3>
              <RecipientForm
                banks={banks}
                onSubmit={handleAddRecipient}
                onCancel={recipients && recipients.length > 0 ? () => setAddingRecipient(false) : undefined}
                submitLabel="Save and select"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <RecipientPicker
                recipients={recipients ?? []}
                banks={banks}
                selectedId={recipientId}
                onSelect={(id) => {
                  setRecipientId(id);
                  setRecipientError(null);
                }}
              />
              <Button variant="secondary" fullWidth onClick={() => setAddingRecipient(true)}>
                + Add new recipient
              </Button>
              {recipientError && <Alert tone="error">{recipientError}</Alert>}
            </div>
          )}
          {!addingRecipient && (
            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-between">
              <Button variant="secondary" onClick={() => goTo(0)}>Back</Button>
              <Button onClick={continueFromRecipient} disabled={!recipients}>Continue to review</Button>
            </div>
          )}
        </Card>
      )}

      {/* STEP 3 — Review */}
      {step === 2 && selectedRecipient && (
        <Card title="Review your transfer" description="Check everything carefully before you confirm.">
          <div className="grid gap-6 lg:grid-cols-2">
            <QuoteSummary quote={quote} title="Amounts" />
            <div className="rounded-xl border border-slate-200 p-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Recipient</h3>
              <dl className="divide-y divide-slate-100 text-sm">
                {[
                  ["Recipient", recipientDisplayName(selectedRecipient)],
                  ["Destination bank", bankNameFor(banks, selectedRecipient.bankId)],
                  ["Account number", maskAccountNumber(selectedRecipient.accountLast4)],
                  ["Phone", selectedRecipient.phone],
                  ["Sending reason", selectedRecipient.sendingReason],
                ].map(([label, value]) => (
                  <div key={label} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2">
                    <dt className="text-slate-600">{label}</dt>
                    <dd className="break-words text-right font-medium text-slate-900">{value}</dd>
                  </div>
                ))}
              </dl>
              <button
                type="button"
                onClick={() => goTo(1)}
                className="mt-2 min-h-11 text-sm font-semibold text-blue-700 hover:underline"
              >
                Change recipient
              </button>
            </div>
          </div>

          <Alert tone="warning" className="mt-6" title="This is a demo simulation">
            Submitting creates a synthetic transfer request with status “Pending”. No payment is
            taken and no money is sent.
          </Alert>

          <div className="mt-4">
            <CheckboxField
              label={`I confirm the details above are correct and understand this is a simulated ${formatCad(quote.totalCad)} transfer.`}
              checked={confirmed}
              onChange={(e) => {
                setConfirmed(e.target.checked);
                setConfirmError(null);
              }}
              error={confirmError ?? undefined}
            />
          </div>

          {submitError && <Alert tone="error" className="mt-4">{submitError}</Alert>}

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-between">
            <Button variant="secondary" onClick={() => goTo(1)} disabled={submitting}>Back</Button>
            <Button size="lg" onClick={handleSubmit} loading={submitting} loadingText="Submitting demo request…">
              Confirm and submit (demo)
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 4 — Demo submission result */}
      {step === 3 && result && (
        <Card>
          <div className="mx-auto max-w-lg py-4 text-center">
            <div aria-hidden="true" className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">
              ✓
            </div>
            <h2 className="mt-4 text-2xl font-bold text-slate-900">Demo transfer request created</h2>
            <p className="mt-2 text-sm text-slate-600">
              This is a <strong>simulation</strong>. No money has moved. In the live service you&apos;d
              receive updates as your transfer is processed.
            </p>
            <dl className="mt-6 space-y-2 rounded-xl bg-slate-50 p-4 text-left text-sm">
              <div className="flex flex-wrap justify-between gap-2"><dt className="text-slate-600">Reference</dt><dd className="font-mono font-semibold">{result.reference}</dd></div>
              <div className="flex flex-wrap justify-between gap-2"><dt className="text-slate-600">Status</dt><dd><StatusBadge status={result.status} /></dd></div>
              <div className="flex flex-wrap justify-between gap-2"><dt className="text-slate-600">Recipient</dt><dd className="font-medium">{result.recipient.displayName}</dd></div>
              <div className="flex flex-wrap justify-between gap-2"><dt className="text-slate-600">Total</dt><dd className="font-medium tabular-nums">{formatCad(result.totalCad)}</dd></div>
              <div className="flex flex-wrap justify-between gap-2"><dt className="text-slate-600">Recipient gets</dt><dd className="font-medium tabular-nums">{formatEtb(result.receiveAmountEtb)}</dd></div>
            </dl>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <ButtonLink href={`/customer/transactions/${encodeURIComponent(result.id)}`} fullWidth>
                View receipt
              </ButtonLink>
              <Button variant="secondary" fullWidth onClick={startOver}>
                Send another
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}

export default function SendMoneyPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <SendMoneyFlow />
    </Suspense>
  );
}
