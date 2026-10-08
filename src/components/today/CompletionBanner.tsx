/**
 * Full completion celebration (PRD §5.1).
 *
 * Appears only once every focus slot is checked. Deliberately guilt-free: no
 * confetti storm, no score — just permission to enjoy the rest of the day.
 */
export function CompletionBanner() {
  return (
    <div
      role="status"
      className="animate-celebrate relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/12 via-primary/6 to-transparent px-5 py-5"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
          <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
            <path
              d="M4.5 10.5l3.5 3.5 7.5-8"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div>
          <p className="text-[15px] font-medium leading-relaxed text-ink">
            You’ve completed your focus steps for today. The rest of the day
            belongs to you. <span aria-hidden="true">🌱</span>
          </p>
          <p className="mt-1 text-sm text-idle">
            Nothing left to prove — come back whenever you like.
          </p>
        </div>
      </div>
    </div>
  );
}
