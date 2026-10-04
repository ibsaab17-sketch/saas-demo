"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Receipt } from "../../../_components/Receipt";
import { Alert } from "../../../_components/ui/Alert";
import { Button, ButtonLink } from "../../../_components/ui/Button";
import { EmptyState } from "../../../_components/ui/EmptyState";
import { LoadingBlock } from "../../../_components/ui/Spinner";
import { useCurrentCustomer } from "../../../_lib/session-context";
import { customerData } from "../../../_lib/services/data-service";
import type { Transaction } from "../../../_lib/types";

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "notFound" }
  | { kind: "ready"; transaction: Transaction };

function ReceiptView() {
  const customer = useCurrentCustomer();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [showDownloadNote, setShowDownloadNote] = useState(false);

  useEffect(() => {
    let cancelled = false;
    customerData
      .getTransaction(customer.id, id)
      .then((transaction) => {
        if (cancelled) return;
        setState(transaction ? { kind: "ready", transaction } : { kind: "notFound" });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({ kind: "error", message: err instanceof Error ? err.message : "Could not load this receipt." });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [customer.id, id]);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/customer/transactions" className="inline-flex min-h-11 items-center text-sm font-semibold text-blue-700 hover:underline">
          ← Back to My Transactions
        </Link>
        {state.kind === "ready" && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => window.print()}>Print receipt</Button>
            <Button variant="secondary" onClick={() => setShowDownloadNote((v) => !v)} aria-expanded={showDownloadNote}>
              Download PDF
            </Button>
          </div>
        )}
      </div>

      {showDownloadNote && (
        <Alert tone="info" className="mb-4 print:hidden" title="PDF download is coming soon">
          PDF receipts will be generated on the server in a later release. For now, use Print receipt
          and choose “Save as PDF”.
        </Alert>
      )}

      {state.kind === "loading" && <LoadingBlock label="Loading receipt…" />}
      {state.kind === "error" && <Alert tone="error">{state.message}</Alert>}
      {state.kind === "notFound" && (
        <EmptyState
          title="Receipt not found"
          description="This transfer doesn't exist or isn't part of your account."
          action={<ButtonLink href="/customer/transactions">View my transactions</ButtonLink>}
        />
      )}
      {state.kind === "ready" && (
        <>
          <h1 className="sr-only">Receipt {state.transaction.reference}</h1>
          <Receipt transaction={state.transaction} />
        </>
      )}
    </>
  );
}

export default function TransactionReceiptPage() {
  return (
    <Suspense fallback={<LoadingBlock label="Loading receipt…" />}>
      <ReceiptView />
    </Suspense>
  );
}
