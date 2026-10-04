"use client";

import { maskAccountNumber, recipientDisplayName } from "../_lib/format";
import type { Bank, Recipient } from "../_lib/types";
import { DemoTag } from "./ui/StatusBadge";

export function bankNameFor(banks: Bank[], bankId: string): string {
  return banks.find((b) => b.id === bankId)?.name ?? "Unknown bank";
}

export function RecipientSummary({ recipient, banks }: { recipient: Recipient; banks: Bank[] }) {
  return (
    <span className="min-w-0">
      <span className="flex flex-wrap items-center gap-2">
        <span className="break-words font-semibold text-slate-900">{recipientDisplayName(recipient)}</span>
        {recipient.type === "business" && (
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">Business</span>
        )}
        <DemoTag />
      </span>
      <span className="mt-0.5 block text-sm text-slate-600">
        {bankNameFor(banks, recipient.bankId)} · {maskAccountNumber(recipient.accountLast4)}
      </span>
      <span className="block text-xs text-slate-500">{recipient.sendingReason}</span>
    </span>
  );
}

export function RecipientPicker({
  recipients,
  banks,
  selectedId,
  onSelect,
}: {
  recipients: Recipient[];
  banks: Bank[];
  selectedId: string | null;
  onSelect(id: string): void;
}) {
  return (
    <fieldset>
      <legend className="sr-only">Choose a saved recipient</legend>
      <div className="grid gap-3 md:grid-cols-2">
        {recipients.map((recipient) => {
          const selected = recipient.id === selectedId;
          return (
            <label
              key={recipient.id}
              className={`flex min-h-16 cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                selected ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600" : "border-slate-300 bg-white hover:border-slate-400"
              }`}
            >
              <input
                type="radio"
                name="recipient"
                value={recipient.id}
                checked={selected}
                onChange={() => onSelect(recipient.id)}
                className="mt-1 h-4 w-4 shrink-0 accent-blue-600"
              />
              <RecipientSummary recipient={recipient} banks={banks} />
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
