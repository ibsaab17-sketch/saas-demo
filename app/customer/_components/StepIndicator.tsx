export function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <nav aria-label="Progress">
      <p className="mb-2 text-sm font-medium text-slate-600 sm:hidden">
        Step {Math.min(current + 1, steps.length)} of {steps.length}: <span className="text-slate-900">{steps[current]}</span>
      </p>
      <ol className="grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((step, index) => {
          const state = index < current ? "done" : index === current ? "current" : "upcoming";
          return (
            <li key={step} aria-current={state === "current" ? "step" : undefined} className="min-w-0">
              <div
                className={`h-1.5 rounded-full ${
                  state === "upcoming" ? "bg-slate-200" : "bg-blue-600"
                }`}
              />
              <p
                className={`mt-2 hidden truncate text-sm sm:block ${
                  state === "current" ? "font-semibold text-slate-900" : state === "done" ? "text-slate-700" : "text-slate-400"
                }`}
              >
                <span className="mr-1">{index + 1}.</span>
                {step}
              </p>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
