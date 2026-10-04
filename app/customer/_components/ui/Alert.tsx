import type { ReactNode } from "react";

type Tone = "info" | "success" | "warning" | "error";

const tones: Record<Tone, { box: string; icon: string }> = {
  info: { box: "border-blue-200 bg-blue-50 text-blue-900", icon: "ℹ" },
  success: { box: "border-emerald-200 bg-emerald-50 text-emerald-900", icon: "✓" },
  warning: { box: "border-amber-200 bg-amber-50 text-amber-900", icon: "!" },
  error: { box: "border-red-200 bg-red-50 text-red-900", icon: "!" },
};

export function Alert({
  tone = "info",
  title,
  children,
  className = "",
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const t = tones[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex gap-3 rounded-xl border px-4 py-3 text-sm ${t.box} ${className}`}
    >
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-current/10 text-xs font-bold"
      >
        {t.icon}
      </span>
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? "mt-0.5" : ""}>{children}</div>}
      </div>
    </div>
  );
}
