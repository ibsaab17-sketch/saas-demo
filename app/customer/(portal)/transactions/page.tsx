"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { PageHeader } from "../../_components/PortalShell";
import { TransactionList } from "../../_components/TransactionList";
import { Alert } from "../../_components/ui/Alert";
import {
  Button,
  ButtonLink,
} from "../../_components/ui/Button";
import { EmptyState } from "../../_components/ui/EmptyState";
import {
  SelectField,
  TextField,
} from "../../_components/ui/FormField";
import { LoadingBlock } from "../../_components/ui/Spinner";
import { TRANSFER_STATUSES } from "../../_lib/reference-data";

import type {
  Transaction,
  TransferStatus,
} from "../../_lib/types";

interface TransactionListResponse {
  transactions?: Transaction[];
  error?: string;
}

export default function TransactionsPage() {
  const [
    transactions,
    setTransactions,
  ] = useState<Transaction[] | null>(
    null,
  );

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const [
    query,
    setQuery,
  ] = useState("");

  const [
    status,
    setStatus,
  ] = useState<
    TransferStatus | ""
  >("");

  useEffect(() => {
    let cancelled = false;

    async function loadTransactions() {
      try {
        setError(null);

        const response =
          await fetch(
            "/api/customer/transactions",
            {
              method: "GET",
              cache: "no-store",
            },
          );

        let result:
          TransactionListResponse;

        try {
          result =
            (await response.json()) as TransactionListResponse;
        } catch {
          throw new Error(
            "The server returned an invalid response.",
          );
        }

        if (!response.ok) {
          throw new Error(
            result.error ??
              "Could not load transactions.",
          );
        }

        if (!cancelled) {
          setTransactions(
            result.transactions ??
              [],
          );
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load transactions.",
          );

          setTransactions([]);
        }
      }
    }

    void loadTransactions();

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered =
    useMemo(() => {
      if (!transactions) {
        return [];
      }

      const q =
        query
          .trim()
          .toLowerCase();

      return transactions.filter(
        (transaction) => {
          if (
            status &&
            transaction.status !==
              status
          ) {
            return false;
          }

          if (!q) {
            return true;
          }

          const reference =
            transaction.reference
              ?.toLowerCase() ??
            "";

          const recipientName =
            transaction.recipient
              .displayName
              ?.toLowerCase() ??
            "";

          const bankName =
            transaction.recipient
              .bankName
              ?.toLowerCase() ??
            "";

          return (
            reference.includes(q) ||
            recipientName.includes(
              q,
            ) ||
            bankName.includes(q)
          );
        },
      );
    }, [
      transactions,
      query,
      status,
    ]);

  const filtersActive =
    query !== "" ||
    status !== "";

  return (
    <>
      <PageHeader
        title="My Transactions"
        description="Your transfer history. Select a transfer to view its details and payment status."
        action={
          <ButtonLink href="/customer/send">
            Send money
          </ButtonLink>
        }
      />

      <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_14rem]">
        <TextField
          label="Search"
          type="search"
          placeholder="Reference, recipient or bank"
          value={query}
          onChange={(event) =>
            setQuery(
              event.target.value,
            )
          }
        />

        <SelectField
          label="Status"
          value={status}
          onChange={(event) =>
            setStatus(
              event.target
                .value as
                | TransferStatus
                | "",
            )
          }
          placeholder="All statuses"
          options={TRANSFER_STATUSES.map(
            (item) => ({
              value: item,
              label: item,
            }),
          )}
        />
      </div>

      {error && (
        <Alert
          tone="error"
          className="mb-4"
        >
          {error}
        </Alert>
      )}

      {!transactions &&
      !error ? (
        <LoadingBlock label="Loading transactions…" />
      ) : transactions &&
        transactions.length ===
          0 ? (
        <EmptyState
          title="No transfers yet"
          description="Your transfer requests will appear here after you submit them."
          action={
            <ButtonLink href="/customer/send">
              Send money
            </ButtonLink>
          }
        />
      ) : filtered.length ===
        0 ? (
        <EmptyState
          title="No matching transfers"
          description="Try a different search or status."
          action={
            filtersActive ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setQuery("");
                  setStatus("");
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <p
            className="mb-3 text-sm text-slate-500"
            aria-live="polite"
          >
            Showing{" "}
            {filtered.length} of{" "}
            {transactions?.length ??
              0}{" "}
            transfers
          </p>

          <TransactionList
            transactions={
              filtered
            }
          />
        </>
      )}
    </>
  );
}