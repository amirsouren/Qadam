import { NavLink, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { useUiStore } from '../../store/useUiStore';
import { useResolvedDark } from '../../hooks/useTheme';

export const SEARCH_INPUT_ID = 'qadam-search';

const navItems = [
  { to: '/', label: 'Today', end: true },
  { to: '/parking-lot', label: 'Parking Lot', end: false },
  { to: '/calendar', label: 'Calendar', end: false },
];

function Logo() {
  return (
    <NavLink
      to="/"
      className="flex items-center gap-2 rounded-xl outline-none"
      aria-label="Qadam — go to Today"
    >
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-[15px] font-bold text-white shadow-sm">
        ق
      </span>
      <span className="hidden text-[15px] font-semibold tracking-tight text-ink sm:block">
        Qadam
      </span>
    </NavLink>
  );
}

/**
 * Top bar (PRD §4.2): Logo, Calendar shortcut, Settings button and Theme
 * toggle — plus a live search field bound to the `/` shortcut.
 */
export function TopBar() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const search = useUiStore((s) => s.search);
  const setSearch = useUiStore((s) => s.setSearch);
  const openSettings = useUiStore((s) => s.openSettings);
  const location = useLocation();

  const isDark = useResolvedDark(settings.themeMode);

  return (
    <header className="sticky top-0 z-30 border-b border-idle-soft/60 bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-2 px-4 sm:px-6">
        <Logo />

        <nav className="ml-2 hidden items-center gap-1 md:flex" aria-label="Primary">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-lg px-2.5 py-1.5 text-sm transition ${
                  isActive
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-idle hover:bg-idle-soft/50 hover:text-ink'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <div className="relative hidden sm:block">
            <label htmlFor={SEARCH_INPUT_ID} className="sr-only">
              Search tasks
            </label>
            <input
              id={SEARCH_INPUT_ID}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search  ( / )"
              className="h-9 w-36 rounded-xl border border-idle-soft bg-surface px-3 text-sm text-ink placeholder:text-idle transition-all focus:w-52 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/25 lg:w-44"
            />
          </div>

          <NavLink
            to="/calendar"
            className="grid h-9 w-9 place-items-center rounded-xl text-idle transition hover:bg-idle-soft/60 hover:text-ink aria-[current=page]:text-primary"
            aria-label="Open calendar"
            title="Calendar"
          >
            <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" aria-hidden="true">
              <rect
                x="2.5"
                y="4"
                width="15"
                height="13"
                rx="2.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M2.5 8h15M6.5 2.5v3M13.5 2.5v3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </NavLink>

          <ThemeToggle isDark={isDark} onToggle={() => void updateSettings({ themeMode: isDark ? 'light' : 'dark' })} />

          <button
            type="button"
            onClick={openSettings}
            className="grid h-9 w-9 place-items-center rounded-xl text-idle transition hover:bg-idle-soft/60 hover:text-ink"
            aria-label="Open settings"
            title="Settings"
          >
            <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" aria-hidden="true">
              <circle cx="10" cy="10" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M10 2.6v1.8M10 15.6v1.8M17.4 10h-1.8M4.4 10H2.6M15.2 4.8l-1.3 1.3M6.1 13.9l-1.3 1.3M15.2 15.2l-1.3-1.3M6.1 6.1L4.8 4.8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>
      <span className="sr-only" aria-live="polite">
        {location.pathname}
      </span>
    </header>
  );
}

function ThemeToggle({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="grid h-9 w-9 place-items-center rounded-xl text-idle transition hover:bg-idle-soft/60 hover:text-ink"
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Light theme' : 'Dark theme'}
    >
      {isDark ? (
        <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" aria-hidden="true">
          <circle cx="10" cy="10" r="3.6" fill="currentColor" />
          <path
            d="M10 2v2M10 16v2M2 10h2M16 10h2M4.4 4.4l1.4 1.4M14.2 14.2l1.4 1.4M15.6 4.4l-1.4 1.4M5.8 14.2l-1.4 1.4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" aria-hidden="true">
          <path
            d="M16.5 11.5A6.8 6.8 0 018.5 3.5a6.8 6.8 0 108 8z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}


