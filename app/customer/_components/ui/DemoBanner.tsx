export function DemoBanner({ compact = false }: { compact?: boolean }) {
  return (
    <div
      role="note"
      className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900 sm:text-sm print:hidden"
    >
      <strong className="font-semibold">Demo mode</strong>
      {compact ? (
        <> — simulated transfers only. No real money moves.</>
      ) : (
        <>
          {" "}
          — all data is synthetic and transfers are simulated. No real money moves. Do not enter
          real banking information.
        </>
      )}
    </div>
  );
}
