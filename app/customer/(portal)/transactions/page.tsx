"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../_components/PortalShell";
import { TransactionList } from "../../_components/TransactionList";
import { Alert } from "../../_components/ui/Alert";
import { Button, ButtonLink } from "../../_components/ui/Button";
import { EmptyState } from "../../_components/ui/EmptyState";
import { SelectField, TextField } from "../../_components/ui/FormField";
import { LoadingBlock } from "../../_components/ui/Spinner";
import { TRANSFER_STATUSES } from "../../_lib/reference-data";
import { useCurrentCustomer } from "../../_lib/session-context";
import { customerData } from "../../_lib/services/data-service";
import type { Transaction, TransferStatus } from "../../_lib/types";

export default function TransactionsPage() {
  const customer = useCurrentCustomer();
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TransferStatus | "">("");

  useEffect(() => {
    let cancelled = false;
    customerData
      .listTransactions(customer.id)
      .then((list) => {
        if (!cancelled) setTransactions(list);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load transactions.");
      });
    return () => {
      cancelled = true;
    };
  }, [customer.id]);

  const filtered = useMemo(() => {
    if (!transactions) return [];
    const q = query.trim().toLowerCase();
    return transactions.filter((t) => {
      if (status && t.status !== status) return false;
      if (!q) return true;
      return (
        t.reference.toLowerCase().includes(q) ||
        t.recipient.displayName.toLowerCase().includes(q) ||
        t.recipient.bankName.toLowerCase().includes(q)
      );
    });
  }, [transactions, query, status]);

  const filtersActive = query !== "" || status !== "";

  return (
    <>
      <PageHeader
        title="My Transactions"
        description="Your transfer history. Select a transfer to see its receipt."
        action={<ButtonLink href="/customer/send">Send money</ButtonLink>}
      />

      <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_14rem]">
        <TextField
          label="Search"
          type="search"
          placeholder="Reference, recipient or bank"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <SelectField
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as TransferStatus | "")}
          placeholder="All statuses"
          options={TRANSFER_STATUSES.map((s) => ({ value: s, label: s }))}
        />
      </div>

      {error && <Alert tone="error" className="mb-4">{error}</Alert>}

      {!transactions && !error ? (
        <LoadingBlock label="Loading transactions…" />
      ) : transactions && transactions.length === 0 ? (
        <EmptyState
          title="No transfers yet"
          description="When you send money, your simulated transfers will appear here."
          action={<ButtonLink href="/customer/send">Send money</ButtonLink>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No matching transfers"
          description="Try a different search or status."
          action={
            filtersActive && (
              <Button variant="secondary" onClick={() => { setQuery(""); setStatus(""); }}>
                Clear filters
              </Button>
            )
          }
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-500" aria-live="polite">
            Showing {filtered.length} of {transactions?.length ?? 0} transfers · all are DEMO records
          </p>
          <TransactionList transactions={filtered} />
        </>
      )}
    </>
  );
}
