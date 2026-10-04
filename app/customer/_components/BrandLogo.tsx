import Link from "next/link";

export function BrandMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 17h11" />
        <path d="M12 13l4 4-4 4" />
        <path d="M20 7H9" />
        <path d="M12 3L8 7l4 4" />
      </svg>
    </span>
  );
}

export function BrandLogo({
  href = "/customer",
  tone = "dark",
  subtitle = "Customer Portal",
}: {
  href?: string;
  tone?: "dark" | "light";
  subtitle?: string | null;
}) {
  return (
    <Link href={href} className="flex min-h-11 min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
      <BrandMark />
      <span className="min-w-0 leading-tight">
        <span className={`block truncate text-lg font-bold ${tone === "dark" ? "text-slate-900" : "text-white"}`}>
          BusinessFlow
        </span>
        {subtitle && (
          <span className={`block truncate text-xs ${tone === "dark" ? "text-slate-500" : "text-slate-400"}`}>
            {subtitle}
          </span>
        )}
      </span>
    </Link>
  );
}
