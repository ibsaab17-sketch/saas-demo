import type { TransferStatus } from "../../_lib/types";

const styles: Record<TransferStatus, string> = {
  Pending: "bg-amber-50 text-amber-800 ring-amber-200",
  Processing: "bg-blue-50 text-blue-800 ring-blue-200",
  Completed: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  Cancelled: "bg-slate-100 text-slate-700 ring-slate-300",
};

export function StatusBadge({ status }: { status: TransferStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles[status]}`}
    >
      {status}
    </span>
  );
}

export function DemoTag({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900 ${className}`}
    >
      Demo
    </span>
  );
}
