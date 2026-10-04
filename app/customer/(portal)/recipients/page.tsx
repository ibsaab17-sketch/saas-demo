"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PageHeader } from "../../_components/PortalShell";
import { RecipientForm } from "../../_components/RecipientForm";
import { RecipientSummary } from "../../_components/RecipientPicker";
import { Alert } from "../../_components/ui/Alert";
import { Button, ButtonLink } from "../../_components/ui/Button";
import { Card } from "../../_components/ui/Card";
import { EmptyState } from "../../_components/ui/EmptyState";
import { LoadingBlock } from "../../_components/ui/Spinner";
import { recipientDisplayName } from "../../_lib/format";
import { useCurrentCustomer } from "../../_lib/session-context";
import { customerData } from "../../_lib/services/data-service";
import type { Bank, NewRecipientInput, Recipient } from "../../_lib/types";

function RecipientsContent() {
  const customer = useCurrentCustomer();
  const searchParams = useSearchParams();
  const [recipients, setRecipients] = useState<Recipient[] | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(searchParams.get("add") === "1");
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([customerData.listRecipients(customer.id), customerData.listBanks()])
      .then(([list, bankList]) => {
        if (cancelled) return;
        setRecipients(list);
        setBanks(bankList);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Could not load recipients.");
      });
    return () => {
      cancelled = true;
    };
  }, [customer.id]);

  async function handleAdd(input: NewRecipientInput) {
    const created = await customerData.addRecipient(customer.id, input);
    setRecipients((prev) => [created, ...(prev ?? [])]);
    setShowForm(false);
    setNotice(`${recipientDisplayName(created)} was added.`);
    return created;
  }

  async function handleRemove(recipient: Recipient) {
    setRemovingId(recipient.id);
    try {
      await customerData.removeRecipient(customer.id, recipient.id);
      setRecipients((prev) => (prev ?? []).filter((r) => r.id !== recipient.id));
      setNotice(`${recipientDisplayName(recipient)} was removed.`);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not remove the recipient.");
    } finally {
      setRemovingId(null);
      setConfirmRemoveId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Recipients"
        description="People and businesses you send money to."
        action={
          !showForm && (
            <Button onClick={() => { setShowForm(true); setNotice(null); }}>+ Add recipient</Button>
          )
        }
      />

      {notice && <Alert tone="success" className="mb-4">{notice}</Alert>}
      {loadError && <Alert tone="error" className="mb-4">{loadError}</Alert>}

      {showForm && (
        <Card title="Add a new recipient" description="All fields are required unless marked optional." className="mb-6">
          <RecipientForm banks={banks} onSubmit={handleAdd} onCancel={() => setShowForm(false)} />
        </Card>
      )}

      {!recipients && !loadError ? (
        <LoadingBlock label="Loading recipients…" />
      ) : recipients && recipients.length === 0 ? (
        !showForm && (
          <EmptyState
            title="No saved recipients"
            description="Add a recipient to send money faster."
            action={<Button onClick={() => setShowForm(true)}>Add recipient</Button>}
          />
        )
      ) : recipients ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {recipients.map((recipient) => (
            <li key={recipient.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <RecipientSummary recipient={recipient} banks={banks} />
              <p className="mt-1 text-xs text-slate-500">Phone: {recipient.phone}</p>
              {confirmRemoveId === recipient.id ? (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
                  <p className="text-sm text-red-900">Remove {recipientDisplayName(recipient)}? Past receipts are kept.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="danger" onClick={() => handleRemove(recipient)} loading={removingId === recipient.id} loadingText="Removing…">
                      Yes, remove
                    </Button>
                    <Button variant="secondary" onClick={() => setConfirmRemoveId(null)} disabled={removingId === recipient.id}>
                      Keep
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  <ButtonLink href={`/customer/send?recipient=${encodeURIComponent(recipient.id)}`}>Send money</ButtonLink>
                  <Button variant="ghost" onClick={() => setConfirmRemoveId(recipient.id)}>
                    Remove
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

export default function RecipientsPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <RecipientsContent />
    </Suspense>
  );
}
