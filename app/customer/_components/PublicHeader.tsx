import Link from "next/link";
import { BrandLogo } from "./BrandLogo";
import { buttonClasses } from "./ui/Button";

export function PublicHeader({
  showActions = true,
}: {
  showActions?: boolean;
}) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <BrandLogo />

        {showActions && (
          <nav
            aria-label="Account"
            className="flex shrink-0 items-center gap-1 sm:gap-2"
          >
            <Link
              href="/customer/login"
              className={buttonClasses(
                "ghost",
                "md",
                false,
                "px-3",
              )}
            >
              Sign in
            </Link>

            <Link
              href="/customer/register"
              className={buttonClasses(
                "primary",
                "md",
                false,
                "hidden px-3 min-[380px]:inline-flex",
              )}
            >
              Create account
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-slate-500 sm:px-6">
        <p>
          © BusinessFlow. Manage transfer requests,
          recipients, payment proof, status updates,
          and receipts in one place.
        </p>
      </div>
    </footer>
  );
}