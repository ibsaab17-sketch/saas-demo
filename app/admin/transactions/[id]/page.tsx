"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface AdminTransactionDetail {
  id: string;
  reference: string;
  createdAt: string;
  updatedAt: string;

  business: {
    id: string;
    name: string;
  };

  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
    status: string;
  };

  recipient: {
    id: string;
    name: string;
    type: string;
    bankId: string;
    accountLast4: string;
    phone: string;
    sendingReason: string;
    status: string;
  };

  baseCurrency: string;
  quoteCurrency: string;

  sendAmountCad: number;
  feeCad: number;
  feeTreatment: string;
  amountConvertedCad: number;
  totalCad: number;
  exchangeRate: number;
  recipientAmountEtb: number;

  paymentMethod: string;
  paymentStatus: string;
  transactionStatus: string;

  paymentProofAvailable: boolean;
  paymentProofUploadedAt: string | null;

  paymentVerifiedAt: string | null;
  processingStartedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;

  customerNote: string;
}

function formatCad(value: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(value);
}

function formatEtb(value: number) {
  return `${new Intl.NumberFormat("en-CA", {
    maximumFractionDigits: 2,
  }).format(value)} ETB`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString();
}

function formatStatus(value: string) {
  if (!value) {
    return "—";
  }

  return value
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1),
    )
    .join(" ");
}

function formatPaymentMethod(value: string) {
  if (value === "etransfer") {
    return "Interac e-Transfer";
  }

  return formatStatus(value);
}

function formatBankName(bankId: string) {
  const banks: Record<string, string> = {
    "demo-cbe": "Commercial Bank of Ethiopia",
    "demo-awash": "Awash Bank",
    "demo-dashen": "Dashen Bank",
    "demo-abyssinia": "Bank of Abyssinia",
    "demo-coop": "Cooperative Bank of Oromia",
  };

  return banks[bankId] ?? bankId ?? "—";
}

function transactionStatusClasses(status: string) {
  if (status === "completed") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (status === "processing") {
    return "bg-blue-100 text-blue-800";
  }

  if (status === "cancelled") {
    return "bg-red-100 text-red-800";
  }

  return "bg-amber-100 text-amber-800";
}

function paymentStatusClasses(status: string) {
  if (status === "verified") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (status === "rejected") {
    return "bg-red-100 text-red-800";
  }

  if (status === "proof_submitted") {
    return "bg-blue-100 text-blue-800";
  }

  return "bg-amber-100 text-amber-800";
}

function Label({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </p>
  );
}

function Value({
  children,
  large = false,
}: {
  children: React.ReactNode;
  large?: boolean;
}) {
  return (
    <p
      className={`mt-1 font-semibold text-slate-950 ${
        large ? "text-lg" : "text-base"
      }`}
    >
      {children}
    </p>
  );
}

export default function AdminTransactionDetailPage() {
  const params = useParams();
  const router = useRouter();

  const transactionId =
    typeof params.id === "string" ? params.id : "";

  const [transaction, setTransaction] =
    useState<AdminTransactionDetail | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [proofOpening, setProofOpening] =
    useState(false);

  const [proofError, setProofError] =
    useState<string | null>(null);

  const [verifyLoading, setVerifyLoading] =
    useState(false);

  const [verifyError, setVerifyError] =
    useState<string | null>(null);

  const [processingLoading, setProcessingLoading] =
    useState(false);

  const [processingError, setProcessingError] =
    useState<string | null>(null);

  const [completeLoading, setCompleteLoading] =
    useState(false);

  const [completeError, setCompleteError] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTransaction() {
      if (!transactionId) {
        setError("Transaction ID is missing.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/admin/transactions/${transactionId}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Unable to load transaction.",
          );
        }

        if (!cancelled) {
          setTransaction(data.transaction);
        }
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load transaction.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTransaction();

    return () => {
      cancelled = true;
    };
  }, [transactionId]);

  async function handleViewPaymentProof() {
    if (!transactionId || proofOpening) {
      return;
    }

    try {
      setProofOpening(true);
      setProofError(null);

      const response = await fetch(
        `/api/admin/transactions/${transactionId}/payment-proof`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to open payment proof.",
        );
      }

      const proofUrl = data?.proof?.url;

      if (!proofUrl) {
        throw new Error(
          "Payment proof URL was not returned.",
        );
      }

      const proofWindow = window.open(
        proofUrl,
        "_blank",
        "noopener,noreferrer",
      );

      if (!proofWindow) {
        throw new Error(
          "Your browser blocked the payment proof window. Please allow pop-ups and try again.",
        );
      }
    } catch (err) {
      setProofError(
        err instanceof Error
          ? err.message
          : "Unable to open payment proof.",
      );
    } finally {
      setProofOpening(false);
    }
  }

  async function handleVerifyPayment() {
    if (!transactionId || verifyLoading) {
      return;
    }

    const confirmed = window.confirm(
      "Confirm that you independently verified the actual Interac e-Transfer was received. The uploaded proof alone is not payment verification.",
    );

    if (!confirmed) {
      return;
    }

    try {
      setVerifyLoading(true);
      setVerifyError(null);

      const response = await fetch(
        `/api/admin/transactions/${transactionId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "verify_payment",
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to verify payment.",
        );
      }

      setTransaction((current) =>
        current
          ? {
              ...current,

              paymentStatus:
                data.transaction?.paymentStatus ??
                "verified",

              transactionStatus:
                data.transaction
                  ?.transactionStatus ??
                current.transactionStatus,

              paymentVerifiedAt:
                data.transaction
                  ?.paymentVerifiedAt ??
                new Date().toISOString(),
            }
          : current,
      );
    } catch (err) {
      setVerifyError(
        err instanceof Error
          ? err.message
          : "Unable to verify payment.",
      );
    } finally {
      setVerifyLoading(false);
    }
  }

  async function handleStartProcessing() {
    if (!transactionId || processingLoading) {
      return;
    }

    const confirmed = window.confirm(
      "Start processing this transfer? Only continue after payment has been verified and you are ready to process the transfer outside BusinessFlow.",
    );

    if (!confirmed) {
      return;
    }

    try {
      setProcessingLoading(true);
      setProcessingError(null);

      const response = await fetch(
        `/api/admin/transactions/${transactionId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "start_processing",
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to start processing.",
        );
      }

      setTransaction((current) =>
        current
          ? {
              ...current,

              paymentStatus:
                data.transaction?.paymentStatus ??
                current.paymentStatus,

              transactionStatus:
                data.transaction
                  ?.transactionStatus ??
                "processing",

              paymentVerifiedAt:
                data.transaction
                  ?.paymentVerifiedAt ??
                current.paymentVerifiedAt,

              processingStartedAt:
                data.transaction
                  ?.processingStartedAt ??
                new Date().toISOString(),
            }
          : current,
      );
    } catch (err) {
      setProcessingError(
        err instanceof Error
          ? err.message
          : "Unable to start processing.",
      );
    } finally {
      setProcessingLoading(false);
    }
  }

  async function handleMarkCompleted() {
    if (!transactionId || completeLoading) {
      return;
    }

    const confirmed = window.confirm(
      "Mark this transaction as completed? Only continue after the transfer has actually been completed outside BusinessFlow. This confirms the owner has finished processing the transfer.",
    );

    if (!confirmed) {
      return;
    }

    try {
      setCompleteLoading(true);
      setCompleteError(null);

      const response = await fetch(
        `/api/admin/transactions/${transactionId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "complete_transaction",
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to complete the transaction.",
        );
      }

      setTransaction((current) =>
        current
          ? {
              ...current,

              paymentStatus:
                data.transaction?.paymentStatus ??
                current.paymentStatus,

              transactionStatus:
                data.transaction
                  ?.transactionStatus ??
                "completed",

              paymentVerifiedAt:
                data.transaction
                  ?.paymentVerifiedAt ??
                current.paymentVerifiedAt,

              processingStartedAt:
                data.transaction
                  ?.processingStartedAt ??
                current.processingStartedAt,

              completedAt:
                data.transaction?.completedAt ??
                new Date().toISOString(),
            }
          : current,
      );
    } catch (err) {
      setCompleteError(
        err instanceof Error
          ? err.message
          : "Unable to complete the transaction.",
      );
    } finally {
      setCompleteLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-4 text-slate-950 sm:p-6 md:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-xl border border-slate-300 bg-white p-8 shadow-sm">
            <p className="font-medium text-slate-700">
              Loading transaction...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !transaction) {
    return (
      <main className="min-h-screen bg-slate-100 p-4 text-slate-950 sm:p-6 md:p-8">
        <div className="mx-auto max-w-6xl">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mb-6 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            ← Back to Dashboard
          </button>

          <div className="rounded-xl border border-red-300 bg-red-50 p-6 font-medium text-red-800">
            {error ||
              "Transaction could not be loaded."}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-300 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6 md:flex-row md:items-center md:justify-between md:px-8">
          <div>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="mb-3 text-sm font-semibold text-blue-700 hover:text-blue-900"
            >
              ← Back to Transactions
            </button>

            <h1 className="text-2xl font-bold text-slate-950">
              Transaction #{transaction.reference}
            </h1>

            <p className="mt-1 text-sm font-medium text-slate-600">
              Created{" "}
              {formatDate(transaction.createdAt)}
            </p>
          </div>

          <span
            className={`w-fit rounded-full px-4 py-2 text-sm font-bold ${transactionStatusClasses(
              transaction.transactionStatus,
            )}`}
          >
            {formatStatus(
              transaction.transactionStatus,
            )}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-300 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">
              Customer
            </h2>

            <div className="mt-6 space-y-5">
              <div>
                <Label>Name</Label>
                <Value>
                  {transaction.customer.name}
                </Value>
              </div>

              <div>
                <Label>Email</Label>
                <Value>
                  {transaction.customer.email ||
                    "—"}
                </Value>
              </div>

              <div>
                <Label>Phone</Label>
                <Value>
                  {transaction.customer.phone ||
                    "—"}
                </Value>
              </div>

              <div>
                <Label>Customer Status</Label>
                <Value>
                  {formatStatus(
                    transaction.customer.status,
                  )}
                </Value>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-300 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">
              Recipient
            </h2>

            <div className="mt-6 space-y-5">
              <div>
                <Label>Name</Label>
                <Value>
                  {transaction.recipient.name}
                </Value>
              </div>

              <div>
                <Label>Bank</Label>
                <Value>
                  {formatBankName(
                    transaction.recipient.bankId,
                  )}
                </Value>
              </div>

              <div>
                <Label>Account</Label>
                <Value>
                  {transaction.recipient
                    .accountLast4
                    ? `•••• ${transaction.recipient.accountLast4}`
                    : "—"}
                </Value>
              </div>

              <div>
                <Label>Phone</Label>
                <Value>
                  {transaction.recipient.phone ||
                    "—"}
                </Value>
              </div>

              <div>
                <Label>Sending Reason</Label>
                <Value>
                  {transaction.recipient
                    .sendingReason || "—"}
                </Value>
              </div>
            </div>
          </section>
        </div>

        <section className="rounded-xl border border-slate-300 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">
            Transfer Details
          </h2>

          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label>Send Amount</Label>
              <Value large>
                {formatCad(
                  transaction.sendAmountCad,
                )}
              </Value>
            </div>

            <div>
              <Label>Transfer Fee</Label>
              <Value large>
                {formatCad(transaction.feeCad)}
              </Value>
            </div>

            <div>
              <Label>Amount Converted</Label>
              <Value large>
                {formatCad(
                  transaction.amountConvertedCad,
                )}
              </Value>
            </div>

            <div>
              <Label>Total Customer Paid</Label>
              <Value large>
                {formatCad(transaction.totalCad)}
              </Value>
            </div>

            <div>
              <Label>Exchange Rate</Label>
              <Value large>
                1 CAD ={" "}
                {transaction.exchangeRate.toFixed(
                  2,
                )}{" "}
                ETB
              </Value>
            </div>

            <div>
              <Label>Recipient Receives</Label>
              <Value large>
                {formatEtb(
                  transaction.recipientAmountEtb,
                )}
              </Value>
            </div>

            <div>
              <Label>Fee Treatment</Label>
              <Value large>
                {formatStatus(
                  transaction.feeTreatment,
                )}
              </Value>
            </div>

            <div>
              <Label>Reference</Label>
              <Value large>
                {transaction.reference}
              </Value>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-300 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                Payment
              </h2>

              <p className="mt-1 text-sm font-medium text-slate-600">
                Customer payment information and
                uploaded proof.
              </p>
            </div>

            <span
              className={`w-fit rounded-full px-4 py-2 text-sm font-bold ${paymentStatusClasses(
                transaction.paymentStatus,
              )}`}
            >
              {formatStatus(
                transaction.paymentStatus,
              )}
            </span>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label>Payment Method</Label>
              <Value>
                {formatPaymentMethod(
                  transaction.paymentMethod,
                )}
              </Value>
            </div>

            <div>
              <Label>Payment Proof</Label>
              <Value>
                {transaction.paymentProofAvailable
                  ? "Uploaded"
                  : "Not uploaded"}
              </Value>
            </div>

            <div>
              <Label>Proof Uploaded</Label>
              <Value>
                {formatDate(
                  transaction.paymentProofUploadedAt,
                )}
              </Value>
            </div>
          </div>

          {transaction.paymentProofAvailable ? (
            <div className="mt-6 rounded-lg border border-blue-300 bg-blue-50 p-5">
              <p className="font-bold text-blue-950">
                Payment proof has been submitted.
              </p>

              <p className="mt-1 text-sm font-medium text-blue-800">
                The proof is stored privately. Owner
                access uses a short-lived secure link.
              </p>

              {proofError && (
                <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800">
                  {proofError}
                </div>
              )}

              <button
                type="button"
                onClick={handleViewPaymentProof}
                disabled={proofOpening}
                className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700"
              >
                {proofOpening
                  ? "Opening Payment Proof..."
                  : "View Payment Proof"}
              </button>
            </div>
          ) : (
            <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-5 font-medium text-amber-900">
              The customer has not uploaded payment
              proof.
            </div>
          )}
        </section>

        {transaction.customerNote && (
          <section className="rounded-xl border border-slate-300 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">
              Customer Note
            </h2>

            <p className="mt-3 whitespace-pre-wrap font-medium text-slate-800">
              {transaction.customerNote}
            </p>
          </section>
        )}

        <section className="rounded-xl border border-slate-300 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">
            Owner Actions
          </h2>

          <p className="mt-1 text-sm font-medium text-slate-600">
            Verify that the actual Interac e-Transfer
            was received before processing this
            transaction. Mark the transaction completed
            only after the external transfer has
            actually been completed.
          </p>

          <div className="mt-6">
            {transaction.paymentStatus ===
              "proof_submitted" &&
              transaction.transactionStatus ===
                "pending" && (
                <div>
                  {verifyError && (
                    <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800">
                      {verifyError}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleVerifyPayment}
                    disabled={verifyLoading}
                    className="rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700"
                  >
                    {verifyLoading
                      ? "Verifying Payment..."
                      : "Verify Payment"}
                  </button>
                </div>
              )}

            {transaction.paymentStatus ===
              "awaiting_payment" && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 font-medium text-amber-900">
                Waiting for the customer to submit
                payment proof.
              </div>
            )}

            {transaction.paymentStatus ===
              "verified" &&
              transaction.transactionStatus ===
                "pending" && (
                <div>
                  {processingError && (
                    <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800">
                      {processingError}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={
                      handleStartProcessing
                    }
                    disabled={processingLoading}
                    className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700"
                  >
                    {processingLoading
                      ? "Starting Processing..."
                      : "Start Processing"}
                  </button>
                </div>
              )}

            {transaction.paymentStatus ===
              "verified" &&
              transaction.transactionStatus ===
                "processing" && (
                <div>
                  {completeError && (
                    <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800">
                      {completeError}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleMarkCompleted}
                    disabled={completeLoading}
                    className="rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700"
                  >
                    {completeLoading
                      ? "Completing Transaction..."
                      : "Mark Completed"}
                  </button>
                </div>
              )}

            {transaction.transactionStatus ===
              "completed" && (
              <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 font-semibold text-emerald-900">
                This transaction has been completed.
              </div>
            )}

            {transaction.transactionStatus ===
              "cancelled" && (
              <div className="rounded-lg border border-red-300 bg-red-50 p-4 font-semibold text-red-800">
                This transaction has been cancelled.
              </div>
            )}
          </div>

          <p className="mt-4 text-xs font-medium text-slate-600">
            Payment verification, processing, and
            completion are connected securely.
            BusinessFlow records the workflow; the
            actual transfer is completed outside the
            application.
          </p>
        </section>

        <section className="rounded-xl border border-slate-300 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">
            Timeline
          </h2>

          <div className="mt-6 space-y-4 text-sm">
            <div className="flex justify-between gap-4 border-b border-slate-200 pb-4">
              <span className="font-medium text-slate-600">
                Transaction created
              </span>

              <span className="text-right font-semibold text-slate-950">
                {formatDate(
                  transaction.createdAt,
                )}
              </span>
            </div>

            <div className="flex justify-between gap-4 border-b border-slate-200 pb-4">
              <span className="font-medium text-slate-600">
                Payment proof uploaded
              </span>

              <span className="text-right font-semibold text-slate-950">
                {formatDate(
                  transaction.paymentProofUploadedAt,
                )}
              </span>
            </div>

            <div className="flex justify-between gap-4 border-b border-slate-200 pb-4">
              <span className="font-medium text-slate-600">
                Payment verified
              </span>

              <span className="text-right font-semibold text-slate-950">
                {formatDate(
                  transaction.paymentVerifiedAt,
                )}
              </span>
            </div>

            <div className="flex justify-between gap-4 border-b border-slate-200 pb-4">
              <span className="font-medium text-slate-600">
                Processing started
              </span>

              <span className="text-right font-semibold text-slate-950">
                {formatDate(
                  transaction.processingStartedAt,
                )}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="font-medium text-slate-600">
                Completed
              </span>

              <span className="text-right font-semibold text-slate-950">
                {formatDate(
                  transaction.completedAt,
                )}
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}