import { NavLink } from 'react-router-dom';

interface NavItem {
  to: string;
  label: string;
  end: boolean;
  path: string;
}

const items: NavItem[] = [
  { to: '/', label: 'Today', end: true, path: 'M3.5 10.5l4 4 9-9' },
  {
    to: '/parking-lot',
    label: 'Lot',
    end: false,
    path: 'M4 5.5h12M4 10h12M4 14.5h7',
  },
  {
    to: '/calendar',
    label: 'Calendar',
    end: false,
    path: 'M3.5 5h13v11.5h-13zM3.5 8.5h13M7 3.5v3M13 3.5v3',
  },
];

/**
 * Sticky bottom pill navigation for small screens (PRD §4.2). Hidden on
 * desktop where the top bar already carries the routes.
 */
export function BottomNav() {
  return (
    <nav
      aria-label="Primary (mobile)"
      className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden"
    >
      <div className="flex items-center gap-1 rounded-full border border-idle-soft/70 bg-surface/90 p-1.5 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-slate-800/90">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium transition ${
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-idle hover:text-ink'
              }`
            }
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
              <path
                d={item.path}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
