import type { RecipientType, TransferStatus } from "./types";

export const SENDING_REASONS = [
  "Family support",
  "Education",
  "Medical expenses",
  "Gift",
  "Business payment",
  "Other",
] as const;

export const RECIPIENT_TYPES: { id: RecipientType; label: string }[] = [
  { id: "individual", label: "Individual" },
  { id: "business", label: "Business" },
];

export const TRANSFER_STATUSES: TransferStatus[] = [
  "Pending",
  "Processing",
  "Completed",
  "Cancelled",
];
