# Qadam — قدم

> An anti-overwhelm, minimalist, **local-first**, zero-guilt personal task manager for the browser.

Qadam is a serene workspace built around cognitive ease instead of analytics,
streaks and backlogs. Everything runs in your browser, works fully offline, and
never asks you to create an account.

---

## Highlights

| PRD requirement | Implementation |
| --- | --- |
| Rule of 3 focus slots | `TodayPage` + `FocusSlot`, exactly `dailyFocusGoal` slots |
| Immediate expansion / deferred reduction | `lib/goals.ts` → `planGoalChange()` |
| Morning reconciliation (no midnight migration) | `MorningReconciliationDialog` + `App` cold start |
| Recurring reminders anchored to registered date | `lib/recurrence.ts` → `nextOccurrence()` |
| Cross-tab sync | `lib/sync.ts` (BroadcastChannel) + store reload |
| Zero-guilt calendar, `idle_gray` for unvisited days | `CalendarPage`, `DayDetailCard` |
| Jalali ⇄ Gregorian | vendored `lib/jalali.ts` (validated against `Intl`) |
| PWA: offline + installable | `vite-plugin-pwa` / Workbox |
| Keyboard-first | `N`, `/`, `1..7`, `?`, `Esc` |

## Stack

- **React 19 + TypeScript + Vite 8**
- **Tailwind CSS v4** (design tokens per PRD §4.1, class-based dark mode)
- **Zustand** for state · **Dexie.js** (IndexedDB) for local-first storage
- **Radix UI Dialog** for accessible modals · **react-router-dom** (hash routing)
- **vite-plugin-pwa** (Workbox) for the service worker

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

> Node is not assumed to be on your `PATH` in this environment; it was installed
> to `~/.local/nodejs`. If needed: `export PATH="$HOME/.local/nodejs/bin:$PATH"`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check + production build (generates the SW) |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | `tsc -b` across app + config |
| `npm run test` | Unit tests (Jalali, recurrence, goals, dates, selectors) |
| `npm run verify` | typecheck → test → build → bundle probes |
| `npm run smoke` | **Live browser E2E** in headless Chrome (build first) |
| `npm run icons` | Regenerate PNG icons (pure Node, no image deps) |

## Validation status

- `npm run verify` — typecheck clean, **33 unit tests** passing, bundle probes passing
- `npm run smoke` — **23 live checks** in headless Chrome covering:
  Rule-of-3 slots · quick add · `N` / `Esc` shortcuts · completion + celebration ·
  Parking Lot & one-click promote · calendar grid & zero-guilt card ·
  IndexedDB persistence across reload · morning reconciliation flow ·
  **live cross-tab propagation** · dark mode · mobile bottom pill nav ·
  zero uncaught page/console errors

## Architecture

```
src/
├── types.ts                 # PRD §3 models (+2 documented extensions)
├── db/
│   ├── database.ts          # Dexie schema, settings bootstrap
│   └── repo.ts              # all reads/writes, completion, logs, reconciliation
├── store/
│   ├── useAppStore.ts       # data + settings actions (commit → reload → broadcast)
│   ├── useUiStore.ts        # modals, search, selected day
│   └── selectors.ts         # derived views (slots, celebration, day summary)
├── lib/                     # pure logic — fully unit tested
│   ├── jalali.ts            # vendored Persian calendar (33-year rule)
│   ├── recurrence.ts        # PRD §6.3 next-occurrence anchoring
│   ├── goals.ts             # PRD §6.2 focus-limit rules
│   ├── date.ts, format.ts   # ISO date math + localized rendering
│   ├── sync.ts              # BroadcastChannel (PRD §6.4)
│   └── sound.ts             # optional soft tick / celebration
├── hooks/                   # theme, shortcuts, notifications, day watcher
├── components/              # layout, today, calendar, ui primitives, dialogs
└── pages/                   # Today · Parking Lot · Calendar
```

### Business rules worth knowing

1. **Focus goal (§6.2)** — raising applies instantly; lowering below today's
   active count stores `pendingDailyFocusGoal`, which lands on the next calendar
   day. Today's commitments are never truncated.
2. **Recurrence (§6.3)** — `nextOccurrence()` steps from the task's
   `originDate`, so the anniversary never drifts to whenever you pressed Done.
   Month-length clamping is applied against the *anchor*, so `Jan 31 → Feb 28 →
   Mar 31`, and a `Feb 29` birthday returns to `Feb 29` in leap years.
3. **Morning prompt (§6.1)** — no background migration at midnight. On the first
   session of a new day, unfinished focus/reminder tasks raise a non-blocking
   *Move to Today / Send to Parking Lot / Discard* choice.
4. **Calendar (§5.3)** — a `DailyLog` row is only created for days you actually
   open (or days with real activity), so skipped days stay `idle_gray`. No
   streaks, no red badges, no failure language.

### Documented deviations from the PRD schema

Two fields were added beyond PRD §3 (both optional and documented in
`types.ts`): `UserSettings.pendingDailyFocusGoal` (required by §6.2) and
`TaskItem.originDate` (required by §6.3). The stored settings row also carries
an internal `id` primary key.

### Known limitations

- **Reminders are in-page.** With no push server, notifications fire while the
  app (or its installed window) is running — the service worker renders them
  when backgrounded, but there is no wake-up from a fully closed browser.
- Clearing site data clears the app data: that is the local-first trade-off.
