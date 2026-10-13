"use client";

import { useSearchParams } from "next/navigation";
import {
  ChangeEvent,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";

import { PageHeader } from "../../_components/PortalShell";
import { QuoteSummary } from "../../_components/QuoteSummary";
import {
  quoteFromInput,
  RateCalculator,
} from "../../_components/RateCalculator";
import { RecipientForm } from "../../_components/RecipientForm";
import {
  bankNameFor,
  RecipientPicker,
} from "../../_components/RecipientPicker";
import { StepIndicator } from "../../_components/StepIndicator";
import { Alert } from "../../_components/ui/Alert";
import {
  Button,
  ButtonLink,
} from "../../_components/ui/Button";
import { Card } from "../../_components/ui/Card";
import { CheckboxField } from "../../_components/ui/FormField";
import { LoadingBlock } from "../../_components/ui/Spinner";
import { StatusBadge } from "../../_components/ui/StatusBadge";

import { DEFAULT_SEND_AMOUNT_CAD } from "../../_lib/config";
import {
  formatCad,
  formatEtb,
  maskAccountNumber,
  recipientDisplayName,
} from "../../_lib/format";
import { useCurrentCustomer } from "../../_lib/session-context";
import { customerData } from "../../_lib/services/data-service";
import { getSupabaseCurrentFee } from "../../_lib/services/supabase-fee-service";
import { getSupabaseCurrentRate } from "../../_lib/services/supabase-rate-service";
import { createSupabaseTransaction } from "../../_lib/services/supabase-transaction-service";

import type {
  Bank,
  DeliverySpeed,
  NewRecipientInput,
  Recipient,
  Transaction,
} from "../../_lib/types";

const STEPS = [
  "Amount",
  "Recipient",
  "Payment Proof",
  "Review",
  "Submitted",
];

const MAX_PROOF_SIZE =
  10 * 1024 * 1024;

const ALLOWED_PROOF_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ]);

function initialAmount(
  raw: string | null,
): string {
  const n = raw
    ? Number.parseFloat(raw)
    : Number.NaN;

  return Number.isFinite(n) && n > 0
    ? String(n)
    : String(DEFAULT_SEND_AMOUNT_CAD);
}

function SendMoneyFlow() {
  const customer = useCurrentCustomer();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(0);

  const [amountText, setAmountText] =
    useState(() =>
      initialAmount(
        searchParams.get("amount"),
      ),
    );

  const [speed, setSpeed] =
    useState<DeliverySpeed>(() =>
      searchParams.get("speed") ===
      "express"
        ? "express"
        : "standard",
    );

  const [
    showAmountErrors,
    setShowAmountErrors,
  ] = useState(false);

  /*
   * Business-controlled pricing.
   */
  const [
    businessRate,
    setBusinessRate,
  ] = useState<number | null>(null);

  const [
    businessFee,
    setBusinessFee,
  ] = useState<number | null>(null);

  const [
    pricingLoading,
    setPricingLoading,
  ] = useState(true);

  const [
    pricingError,
    setPricingError,
  ] = useState<string | null>(null);

  /*
   * Customer fee choice.
   *
   * false:
   * $500 entered
   * $5 fee added
   * $505 total paid
   * $500 converted
   *
   * true:
   * $500 entered
   * $5 fee deducted
   * $500 total paid
   * $495 converted
   */
  const [
    feeIncludedInAmount,
    setFeeIncludedInAmount,
  ] = useState(false);

  const [
    recipients,
    setRecipients,
  ] = useState<Recipient[] | null>(null);

  const [banks, setBanks] =
    useState<Bank[]>([]);

  const [
    loadError,
    setLoadError,
  ] = useState<string | null>(null);

  const [
    recipientId,
    setRecipientId,
  ] = useState<string | null>(() =>
    searchParams.get("recipient"),
  );

  const [
    addingRecipient,
    setAddingRecipient,
  ] = useState(false);

  const [
    recipientError,
    setRecipientError,
  ] = useState<string | null>(null);

  /*
   * Payment proof selected before
   * the transaction is submitted.
   */
  const [
    paymentProof,
    setPaymentProof,
  ] = useState<File | null>(null);

  const [
    proofError,
    setProofError,
  ] = useState<string | null>(null);

  const [
    confirmed,
    setConfirmed,
  ] = useState(false);

  const [
    confirmError,
    setConfirmError,
  ] = useState<string | null>(null);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    submitError,
    setSubmitError,
  ] = useState<string | null>(null);

  const [
    result,
    setResult,
  ] = useState<Transaction | null>(
    null,
  );

  /*
   * If transaction creation succeeds
   * but proof upload fails, we must not
   * tell the customer everything succeeded.
   */
  const [
    proofUploadFailed,
    setProofUploadFailed,
  ] = useState(false);

  const headingRef =
    useRef<HTMLDivElement>(null);

  /*
   * Load current business pricing.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadPricing() {
      setPricingLoading(true);
      setPricingError(null);

      try {
        const [
          rateResult,
          feeResult,
        ] = await Promise.all([
          getSupabaseCurrentRate(),
          getSupabaseCurrentFee(),
        ]);

        if (cancelled) {
          return;
        }

        setBusinessRate(
          rateResult.rate,
        );

        setBusinessFee(
          feeResult.feeCad,
        );
      } catch (err: unknown) {
        if (cancelled) {
          return;
        }

        setPricingError(
          err instanceof Error
            ? err.message
            : "Could not load the current rate and transfer fee.",
        );
      } finally {
        if (!cancelled) {
          setPricingLoading(false);
        }
      }
    }

    loadPricing();

    return () => {
      cancelled = true;
    };
  }, [customer.id]);

  /*
   * Load recipients and banks.
   */
  useEffect(() => {
    let cancelled = false;

    Promise.all([
      customerData.listRecipients(
        customer.id,
      ),
      customerData.listBanks(),
    ])
      .then(
        ([list, bankList]) => {
          if (cancelled) {
            return;
          }

          setRecipients(list);
          setBanks(bankList);

          setRecipientId(
            (current) =>
              current &&
              list.some(
                (recipient) =>
                  recipient.id ===
                  current,
              )
                ? current
                : null,
          );

          if (list.length === 0) {
            setAddingRecipient(true);
          }
        },
      )
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(
            err instanceof Error
              ? err.message
              : "Could not load recipients.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [customer.id]);

  function goTo(next: number) {
    setStep(next);

    headingRef.current?.scrollIntoView(
      {
        behavior: "smooth",
        block: "start",
      },
    );
  }

  const {
    quote,
    error: amountError,
  } = quoteFromInput(
    amountText,
    speed,
    businessRate ?? 0,
    businessFee ?? 0,
    feeIncludedInAmount,
  );

  const selectedRecipient =
    recipients?.find(
      (recipient) =>
        recipient.id === recipientId,
    ) ?? null;

  function continueFromAmount() {
    if (pricingLoading) {
      return;
    }

    if (
      pricingError ||
      businessRate === null ||
      businessFee === null
    ) {
      return;
    }

    if (amountError) {
      setShowAmountErrors(true);
      return;
    }

    goTo(1);
  }

  function continueFromRecipient() {
    if (!selectedRecipient) {
      setRecipientError(
        "Choose a recipient or add a new one.",
      );

      return;
    }

    setRecipientError(null);

    goTo(2);
  }

  async function handleAddRecipient(
    input: NewRecipientInput,
  ) {
    const created =
      await customerData.addRecipient(
        customer.id,
        input,
      );

    setRecipients((previous) => [
      created,
      ...(previous ?? []),
    ]);

    setRecipientId(created.id);
    setAddingRecipient(false);
    setRecipientError(null);

    return created;
  }

  function handleProofChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    setProofError(null);
    setSubmitError(null);

    const file =
      event.target.files?.[0] ??
      null;

    if (!file) {
      setPaymentProof(null);
      return;
    }

    if (
      !ALLOWED_PROOF_TYPES.has(
        file.type,
      )
    ) {
      setPaymentProof(null);

      setProofError(
        "Please choose a JPG, PNG, WebP, or PDF file.",
      );

      event.target.value = "";

      return;
    }

    if (file.size <= 0) {
      setPaymentProof(null);

      setProofError(
        "The selected file is empty.",
      );

      event.target.value = "";

      return;
    }

    if (
      file.size >
      MAX_PROOF_SIZE
    ) {
      setPaymentProof(null);

      setProofError(
        "Payment proof must be 10 MB or smaller.",
      );

      event.target.value = "";

      return;
    }

    setPaymentProof(file);
  }

  function continueFromProof() {
    if (!paymentProof) {
      setProofError(
        "Please upload your Interac e-Transfer proof before continuing.",
      );

      return;
    }

    setProofError(null);
    setConfirmed(false);
    setConfirmError(null);

    goTo(3);
  }

  /*
   * Final submission:
   *
   * 1. Create the real transaction.
   * 2. Receive the new transaction ID.
   * 3. Upload the selected proof to that
   *    exact transaction.
   * 4. Only show full success when both
   *    operations succeed.
   */
  async function handleSubmit() {
    if (!confirmed) {
      setConfirmError(
        "Please confirm the details before submitting.",
      );

      return;
    }

    if (!selectedRecipient) {
      setSubmitError(
        "The selected recipient is no longer available.",
      );

      return;
    }

    if (!paymentProof) {
      setProofError(
        "Payment proof is required.",
      );

      goTo(2);

      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setProofUploadFailed(false);

    try {
      const txn =
        await createSupabaseTransaction({
          recipientId:
            selectedRecipient.id,

          sendAmountCad:
            quote.sendAmountCad,

          feeIncludedInAmount:
            quote.feeIncludedInAmount,
        });

      /*
       * Store the transaction immediately.
       *
       * If proof upload fails, we still
       * know which transaction was created
       * and can send the customer to its
       * detail page to retry.
       */
      setResult(txn);

      const formData =
        new FormData();

      formData.append(
        "file",
        paymentProof,
      );

      const proofResponse =
        await fetch(
          `/api/customer/transactions/${encodeURIComponent(
            txn.id,
          )}/payment-proof`,
          {
            method: "POST",
            body: formData,
          },
        );

      let proofResult: {
        success?: boolean;
        error?: string;
      } = {};

      try {
        proofResult =
          (await proofResponse.json()) as {
            success?: boolean;
            error?: string;
          };
      } catch {
        /*
         * The HTTP status below still
         * determines success or failure.
         */
      }

      if (!proofResponse.ok) {
        setProofUploadFailed(true);

        setSubmitError(
          proofResult.error ??
            "The transfer request was created, but the payment proof could not be uploaded. Open the transaction and upload the proof again.",
        );

        goTo(4);

        return;
      }

      setProofUploadFailed(false);

      goTo(4);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "The transfer request could not be created.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function startOver() {
    setResult(null);
    setConfirmed(false);
    setConfirmError(null);
    setSubmitError(null);
    setPaymentProof(null);
    setProofError(null);
    setProofUploadFailed(false);

    setAmountText(
      String(
        DEFAULT_SEND_AMOUNT_CAD,
      ),
    );

    setFeeIncludedInAmount(false);
    setShowAmountErrors(false);

    goTo(0);
  }

  return (
    <>
      <div
        ref={headingRef}
        className="scroll-mt-20"
      >
        <PageHeader
          title="Send Money"
          description="Create a CAD to ETB transfer request and submit your Interac e-Transfer payment proof."
        />
      </div>

      <div className="mb-6">
        <StepIndicator
          steps={STEPS}
          current={step}
        />
      </div>

      {/* STEP 1 - Amount */}
      {step === 0 && (
        <Card title="How much are you sending?">
          <div className="mx-auto max-w-xl">
            {pricingLoading ? (
              <LoadingBlock label="Loading current rate and transfer fee..." />
            ) : pricingError ? (
              <Alert
                tone="error"
                title="Could not load pricing"
              >
                {pricingError}
              </Alert>
            ) : businessRate ===
                null ||
              businessFee === null ? (
              <Alert tone="error">
                The current business rate
                or transfer fee is
                unavailable.
              </Alert>
            ) : (
              <RateCalculator
                amountText={
                  amountText
                }
                onAmountTextChange={(
                  value,
                ) => {
                  setAmountText(value);

                  setShowAmountErrors(
                    false,
                  );
                }}
                deliverySpeed={
                  speed
                }
                onDeliverySpeedChange={
                  setSpeed
                }
                exchangeRate={
                  businessRate
                }
                transferFeeCad={
                  businessFee
                }
                feeIncludedInAmount={
                  feeIncludedInAmount
                }
                onFeeIncludedInAmountChange={(
                  included,
                ) => {
                  setFeeIncludedInAmount(
                    included,
                  );

                  setShowAmountErrors(
                    false,
                  );
                }}
                showErrors={
                  showAmountErrors
                }
                footer={
                  <Button
                    size="lg"
                    fullWidth
                    onClick={
                      continueFromAmount
                    }
                  >
                    Continue to
                    recipient
                  </Button>
                }
              />
            )}
          </div>
        </Card>
      )}

      {/* STEP 2 - Recipient */}
      {step === 1 && (
        <Card
          title="Who are you sending to?"
          description={`Sending ${formatCad(
            quote.sendAmountCad,
          )} - recipient receives ${formatEtb(
            quote.receiveAmountEtb,
          )}`}
        >
          {loadError && (
            <Alert
              tone="error"
              className="mb-4"
            >
              {loadError}
            </Alert>
          )}

          {!recipients &&
          !loadError ? (
            <LoadingBlock label="Loading recipients..." />
          ) : addingRecipient ? (
            <div>
              <h3 className="mb-4 text-base font-semibold text-slate-900">
                Add new recipient
              </h3>

              <RecipientForm
                banks={banks}
                onSubmit={
                  handleAddRecipient
                }
                onCancel={
                  recipients &&
                  recipients.length >
                    0
                    ? () =>
                        setAddingRecipient(
                          false,
                        )
                    : undefined
                }
                submitLabel="Save and select"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <RecipientPicker
                recipients={
                  recipients ?? []
                }
                banks={banks}
                selectedId={
                  recipientId
                }
                onSelect={(id) => {
                  setRecipientId(id);

                  setRecipientError(
                    null,
                  );
                }}
              />

              <Button
                variant="secondary"
                fullWidth
                onClick={() =>
                  setAddingRecipient(
                    true,
                  )
                }
              >
                + Add new recipient
              </Button>

              {recipientError && (
                <Alert tone="error">
                  {recipientError}
                </Alert>
              )}
            </div>
          )}

          {!addingRecipient && (
            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-between">
              <Button
                variant="secondary"
                onClick={() =>
                  goTo(0)
                }
              >
                Back
              </Button>

              <Button
                onClick={
                  continueFromRecipient
                }
                disabled={
                  !recipients
                }
              >
                Continue to payment
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* STEP 3 - Payment Proof */}
      {step === 2 &&
        selectedRecipient && (
          <Card
            title="Send payment and upload proof"
            description="Send your Interac e-Transfer outside BusinessFlow, then upload proof of the payment."
          >
            <div className="mx-auto max-w-2xl">
              <Alert
                tone="info"
                title="Interac e-Transfer payment"
              >
                Send{" "}
                <strong>
                  {formatCad(
                    quote.totalCad,
                  )}
                </strong>{" "}
                using the Interac
                e-Transfer payment
                instructions provided
                by the business. Do not
                send money through
                BusinessFlow itself.
              </Alert>

              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-900">
                  Payment summary
                </h3>

                <dl className="mt-3 divide-y divide-slate-200 text-sm">
                  <div className="flex justify-between gap-4 py-2">
                    <dt className="text-slate-600">
                      Send amount
                    </dt>

                    <dd className="font-semibold tabular-nums text-slate-900">
                      {formatCad(
                        quote.sendAmountCad,
                      )}
                    </dd>
                  </div>

                  <div className="flex justify-between gap-4 py-2">
                    <dt className="text-slate-600">
                      Transfer fee
                    </dt>

                    <dd className="font-semibold tabular-nums text-slate-900">
                      {formatCad(
                        quote.feeCad,
                      )}
                    </dd>
                  </div>

                  <div className="flex justify-between gap-4 py-2">
                    <dt className="font-semibold text-slate-900">
                      Total to pay
                    </dt>

                    <dd className="font-bold tabular-nums text-slate-900">
                      {formatCad(
                        quote.totalCad,
                      )}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="mt-6">
                <label
                  htmlFor="payment-proof"
                  className="block text-sm font-semibold text-slate-900"
                >
                  Upload e-Transfer
                  proof
                </label>

                <p className="mt-1 text-sm text-slate-600">
                  Upload the payment
                  confirmation
                  screenshot, photo, or
                  PDF.
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  JPG, PNG, WebP or PDF.
                  Maximum 10 MB.
                </p>

                <input
                  id="payment-proof"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={
                    handleProofChange
                  }
                  className="mt-3 block w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-700 file:mr-4 file:rounded-md file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                />

                {paymentProof && (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="text-sm font-semibold text-emerald-900">
                      Payment proof
                      selected
                    </div>

                    <div className="mt-1 break-all text-sm text-emerald-800">
                      {
                        paymentProof.name
                      }
                    </div>

                    <div className="mt-1 text-xs text-emerald-700">
                      {(
                        paymentProof.size /
                        1024 /
                        1024
                      ).toFixed(2)}{" "}
                      MB
                    </div>
                  </div>
                )}

                {proofError && (
                  <Alert
                    tone="error"
                    className="mt-4"
                  >
                    {proofError}
                  </Alert>
                )}
              </div>

              <Alert
                tone="warning"
                className="mt-5"
                title="Proof is not payment verification"
              >
                Uploading a screenshot
                or receipt does not
                automatically confirm
                that the business
                received the money. The
                business will verify the
                actual Interac
                e-Transfer separately
                before processing the
                transfer.
              </Alert>

              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-between">
                <Button
                  variant="secondary"
                  onClick={() =>
                    goTo(1)
                  }
                >
                  Back
                </Button>

                <Button
                  onClick={
                    continueFromProof
                  }
                  disabled={
                    !paymentProof
                  }
                >
                  Continue to review
                </Button>
              </div>
            </div>
          </Card>
        )}

      {/* STEP 4 - Review */}
      {step === 3 &&
        selectedRecipient &&
        paymentProof && (
          <Card
            title="Review your transfer"
            description="Check the transfer and payment proof before submitting."
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <QuoteSummary
                quote={quote}
                title="Amounts"
              />

              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="mb-2 text-sm font-semibold text-slate-900">
                  Recipient
                </h3>

                <dl className="divide-y divide-slate-100 text-sm">
                  {[
                    [
                      "Recipient",
                      recipientDisplayName(
                        selectedRecipient,
                      ),
                    ],
                    [
                      "Destination bank",
                      bankNameFor(
                        banks,
                        selectedRecipient.bankId,
                      ),
                    ],
                    [
                      "Account number",
                      maskAccountNumber(
                        selectedRecipient.accountLast4,
                      ),
                    ],
                    [
                      "Phone",
                      selectedRecipient.phone,
                    ],
                    [
                      "Sending reason",
                      selectedRecipient.sendingReason,
                    ],
                  ].map(
                    ([
                      label,
                      value,
                    ]) => (
                      <div
                        key={label}
                        className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2"
                      >
                        <dt className="text-slate-600">
                          {label}
                        </dt>

                        <dd className="break-words text-right font-medium text-slate-900">
                          {value}
                        </dd>
                      </div>
                    ),
                  )}
                </dl>

                <button
                  type="button"
                  onClick={() =>
                    goTo(1)
                  }
                  className="mt-2 min-h-11 text-sm font-semibold text-blue-700 hover:underline"
                >
                  Change recipient
                </button>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Interac e-Transfer
                    proof
                  </h3>

                  <p className="mt-1 break-all text-sm text-slate-700">
                    {paymentProof.name}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {(
                      paymentProof.size /
                      1024 /
                      1024
                    ).toFixed(2)}{" "}
                    MB
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    goTo(2)
                  }
                  className="min-h-11 text-sm font-semibold text-blue-700 hover:underline"
                >
                  Change proof
                </button>
              </div>
            </div>

            <Alert
              tone="warning"
              className="mt-6"
              title="Payment awaiting verification"
            >
              BusinessFlow does not move
              your money. Your transfer
              request and payment proof
              will be submitted to the
              business. The business
              must separately verify
              that the Interac
              e-Transfer was actually
              received before processing
              the transfer.
            </Alert>

            <div className="mt-4">
              <CheckboxField
                label={`I confirm the transfer details are correct, I sent ${formatCad(
                  quote.totalCad,
                )} by Interac e-Transfer outside BusinessFlow, and the payment proof I selected relates to this transfer.`}
                checked={
                  confirmed
                }
                onChange={(e) => {
                  setConfirmed(
                    e.target.checked,
                  );

                  setConfirmError(
                    null,
                  );
                }}
                error={
                  confirmError ??
                  undefined
                }
              />
            </div>

            {submitError && (
              <Alert
                tone="error"
                className="mt-4"
              >
                {submitError}
              </Alert>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-between">
              <Button
                variant="secondary"
                onClick={() =>
                  goTo(2)
                }
                disabled={
                  submitting
                }
              >
                Back
              </Button>

              <Button
                size="lg"
                onClick={
                  handleSubmit
                }
                loading={
                  submitting
                }
                loadingText="Submitting transfer..."
                disabled={
                  !confirmed ||
                  submitting
                }
              >
                Confirm and submit
              </Button>
            </div>
          </Card>
        )}

      {/* STEP 5 - Result */}
      {step === 4 && result && (
        <Card>
          <div className="mx-auto max-w-lg py-4 text-center">
            <div
              aria-hidden="true"
              className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
                proofUploadFailed
                  ? "bg-amber-100 text-amber-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {proofUploadFailed
                ? "!"
                : "✓"}
            </div>

            <h2 className="mt-4 text-2xl font-bold text-slate-900">
              {proofUploadFailed
                ? "Transfer created — proof needs attention"
                : "Transfer submitted"}
            </h2>

            {proofUploadFailed ? (
              <p className="mt-2 text-sm text-slate-600">
                Your transfer request
                was created, but the
                payment proof could not
                be uploaded. Do not
                create another transfer.
                Open this transaction and
                upload the proof again.
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-600">
                Your transfer request
                and payment proof were
                submitted. The payment
                is now awaiting
                verification by the
                business before the
                transfer is processed.
              </p>
            )}

            {proofUploadFailed &&
              submitError && (
                <Alert
                  tone="error"
                  className="mt-5 text-left"
                >
                  {submitError}
                </Alert>
              )}

            <dl className="mt-6 space-y-2 rounded-xl bg-slate-50 p-4 text-left text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-slate-600">
                  Reference
                </dt>

                <dd className="font-mono font-semibold">
                  {result.reference}
                </dd>
              </div>

              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-slate-600">
                  Status
                </dt>

                <dd>
                  <StatusBadge
                    status={
                      result.status
                    }
                  />
                </dd>
              </div>

              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-slate-600">
                  Recipient
                </dt>

                <dd className="font-medium">
                  {
                    result.recipient
                      .displayName
                  }
                </dd>
              </div>

              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-slate-600">
                  Send amount
                </dt>

                <dd className="font-medium tabular-nums">
                  {formatCad(
                    result.sendAmountCad,
                  )}
                </dd>
              </div>

              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-slate-600">
                  Transfer fee
                </dt>

                <dd className="font-medium tabular-nums">
                  {formatCad(
                    result.feeCad,
                  )}
                </dd>
              </div>

              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-slate-600">
                  Amount converted
                </dt>

                <dd className="font-medium tabular-nums">
                  {formatCad(
                    result.amountConvertedCad,
                  )}
                </dd>
              </div>

              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-slate-600">
                  Total paid
                </dt>

                <dd className="font-medium tabular-nums">
                  {formatCad(
                    result.totalCad,
                  )}
                </dd>
              </div>

              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-slate-600">
                  Recipient gets
                </dt>

                <dd className="font-medium tabular-nums">
                  {formatEtb(
                    result.receiveAmountEtb,
                  )}
                </dd>
              </div>
            </dl>

            {!proofUploadFailed && (
              <Alert
                tone="success"
                className="mt-6 text-left"
                title="Payment proof submitted"
              >
                Your proof was uploaded
                successfully. This does
                not mean payment has
                already been verified.
                The business will verify
                receipt of the Interac
                e-Transfer separately.
              </Alert>
            )}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <ButtonLink
                href={`/customer/transactions/${encodeURIComponent(
                  result.id,
                )}`}
                fullWidth
              >
                View transaction
              </ButtonLink>

              <Button
                variant="secondary"
                fullWidth
                onClick={
                  startOver
                }
              >
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
    <Suspense
      fallback={
        <LoadingBlock />
      }
    >
      <SendMoneyFlow />
    </Suspense>
  );
}