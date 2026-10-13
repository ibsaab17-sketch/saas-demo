"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ChangeEvent,
  Suspense,
  useEffect,
  useState,
} from "react";

import { Receipt } from "../../../_components/Receipt";
import { Alert } from "../../../_components/ui/Alert";
import {
  Button,
  ButtonLink,
} from "../../../_components/ui/Button";
import { EmptyState } from "../../../_components/ui/EmptyState";
import { LoadingBlock } from "../../../_components/ui/Spinner";

import type { Transaction } from "../../../_lib/types";

type LoadState =
  | {
      kind: "loading";
    }
  | {
      kind: "error";
      message: string;
    }
  | {
      kind: "notFound";
    }
  | {
      kind: "ready";
      transaction: Transaction;
    };

interface TransactionResponse {
  transaction?: Transaction;
  error?: string;
}

interface UploadResponse {
  success?: boolean;
  error?: string;
  transaction?: {
    id: string;
    paymentStatus: string;
    transactionStatus: string;
    paymentProofUploadedAt:
      | string
      | null;
  };
}

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const ALLOWED_FILE_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ]);

function ReceiptView() {
  const params =
    useParams<{
      id: string;
    }>();

  const id =
    params?.id ?? "";

  const [
    state,
    setState,
  ] = useState<LoadState>({
    kind: "loading",
  });

  const [
    selectedFile,
    setSelectedFile,
  ] = useState<File | null>(
    null,
  );

  const [
    fileError,
    setFileError,
  ] = useState<string | null>(
    null,
  );

  const [
    uploading,
    setUploading,
  ] = useState(false);

  const [
    uploadError,
    setUploadError,
  ] = useState<string | null>(
    null,
  );

  const [
    uploadSuccess,
    setUploadSuccess,
  ] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadTransaction() {
      if (!id) {
        if (!cancelled) {
          setState({
            kind: "notFound",
          });
        }

        return;
      }

      try {
        const response =
          await fetch(
            `/api/customer/transactions/${encodeURIComponent(
              id,
            )}`,
            {
              method: "GET",
              cache: "no-store",
            },
          );

        let result:
          TransactionResponse;

        try {
          result =
            (await response.json()) as TransactionResponse;
        } catch {
          throw new Error(
            "The server returned an invalid response.",
          );
        }

        if (
          response.status === 404
        ) {
          if (!cancelled) {
            setState({
              kind: "notFound",
            });
          }

          return;
        }

        if (!response.ok) {
          throw new Error(
            result.error ??
              "Could not load this transaction.",
          );
        }

        if (
          !result.transaction
        ) {
          throw new Error(
            "The transaction was not returned by the server.",
          );
        }

        if (!cancelled) {
          setState({
            kind: "ready",
            transaction:
              result.transaction,
          });
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setState({
            kind: "error",
            message:
              err instanceof Error
                ? err.message
                : "Could not load this transaction.",
          });
        }
      }
    }

    void loadTransaction();

    return () => {
      cancelled = true;
    };
  }, [id]);

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    setFileError(null);
    setUploadError(null);
    setUploadSuccess(false);

    const file =
      event.target.files?.[0] ??
      null;

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (
      !ALLOWED_FILE_TYPES.has(
        file.type,
      )
    ) {
      setSelectedFile(null);

      setFileError(
        "Please choose a JPG, PNG, WebP, or PDF file.",
      );

      event.target.value = "";

      return;
    }

    if (
      file.size >
      MAX_FILE_SIZE
    ) {
      setSelectedFile(null);

      setFileError(
        "Payment proof must be 10 MB or smaller.",
      );

      event.target.value = "";

      return;
    }

    if (file.size <= 0) {
      setSelectedFile(null);

      setFileError(
        "The selected file is empty.",
      );

      event.target.value = "";

      return;
    }

    setSelectedFile(file);
  }

  async function uploadPaymentProof() {
    if (!selectedFile) {
      setFileError(
        "Please select a payment proof file.",
      );

      return;
    }

    if (!id) {
      setUploadError(
        "Transaction ID is missing.",
      );

      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const formData =
        new FormData();

      formData.append(
        "file",
        selectedFile,
      );

      const response =
        await fetch(
          `/api/customer/transactions/${encodeURIComponent(
            id,
          )}/payment-proof`,
          {
            method: "POST",
            body: formData,
          },
        );

      let result:
        UploadResponse;

      try {
        result =
          (await response.json()) as UploadResponse;
      } catch {
        throw new Error(
          "The server returned an invalid response.",
        );
      }

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Could not upload the payment proof.",
        );
      }

      setUploadSuccess(true);
      setSelectedFile(null);
      setFileError(null);
    } catch (err: unknown) {
      setUploadError(
        err instanceof Error
          ? err.message
          : "Could not upload the payment proof.",
      );
    } finally {
      setUploading(false);
    }
  }

  function downloadReceipt() {
    if (!id) {
      return;
    }

    window.location.href =
      `/api/customer/transactions/${encodeURIComponent(
        id,
      )}/receipt`;
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/customer/transactions"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-blue-700 hover:underline"
        >
          ← Back to My Transactions
        </Link>

        {state.kind ===
          "ready" && (
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() =>
                window.print()
              }
            >
              Print receipt
            </Button>

            <Button
              variant="secondary"
              onClick={
                downloadReceipt
              }
            >
              Download PDF
            </Button>
          </div>
        )}
      </div>

      {state.kind ===
        "loading" && (
        <LoadingBlock label="Loading transaction…" />
      )}

      {state.kind ===
        "error" && (
        <Alert tone="error">
          {state.message}
        </Alert>
      )}

      {state.kind ===
        "notFound" && (
        <EmptyState
          title="Transaction not found"
          description="This transfer doesn't exist or isn't part of your account."
          action={
            <ButtonLink href="/customer/transactions">
              View my transactions
            </ButtonLink>
          }
        />
      )}

      {state.kind ===
        "ready" && (
        <>
          <h1 className="sr-only">
            Transaction{" "}
            {
              state.transaction
                .reference
            }
          </h1>

          <Receipt
            transaction={
              state.transaction
            }
          />

          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 print:hidden">
            <h2 className="text-lg font-bold text-slate-900">
              Payment proof
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              After sending your
              Interac e-Transfer
              outside BusinessFlow,
              upload a screenshot,
              photo, or PDF of the
              payment confirmation.
            </p>

            <Alert
              tone="warning"
              className="mt-4"
              title="Before uploading"
            >
              Uploading proof does
              not automatically
              confirm that payment
              was received. The
              business will verify
              the actual payment
              separately before
              processing the
              transfer.
            </Alert>

            {uploadSuccess && (
              <Alert
                tone="success"
                className="mt-4"
                title="Payment proof submitted"
              >
                Your payment proof
                was uploaded
                successfully. The
                business can now
                review and verify
                the payment.
              </Alert>
            )}

            {uploadError && (
              <Alert
                tone="error"
                className="mt-4"
              >
                {uploadError}
              </Alert>
            )}

            <div className="mt-5">
              <label
                htmlFor="payment-proof"
                className="block text-sm font-semibold text-slate-900"
              >
                Payment proof file
              </label>

              <p className="mt-1 text-xs text-slate-500">
                JPG, PNG, WebP or
                PDF. Maximum 10 MB.
              </p>

              <input
                id="payment-proof"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={
                  handleFileChange
                }
                disabled={
                  uploading
                }
                className="mt-3 block w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-700 file:mr-4 file:rounded-md file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
              />

              {selectedFile && (
                <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
                  <div className="font-medium text-slate-900">
                    {
                      selectedFile.name
                    }
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    {(
                      selectedFile.size /
                      1024 /
                      1024
                    ).toFixed(2)}{" "}
                    MB
                  </div>
                </div>
              )}

              {fileError && (
                <p className="mt-2 text-sm font-medium text-red-700">
                  {fileError}
                </p>
              )}

              <div className="mt-4">
                <Button
                  onClick={
                    uploadPaymentProof
                  }
                  disabled={
                    !selectedFile ||
                    uploading
                  }
                  loading={
                    uploading
                  }
                  loadingText="Uploading proof..."
                >
                  Upload payment
                  proof
                </Button>
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}

export default function TransactionReceiptPage() {
  return (
    <Suspense
      fallback={
        <LoadingBlock label="Loading transaction…" />
      }
    >
      <ReceiptView />
    </Suspense>
  );
}