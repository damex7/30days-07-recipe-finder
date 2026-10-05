import { Link, NavLink, Outlet } from 'react-router-dom'
import { Icon } from './Icon.jsx'
import { ThemeToggle } from './ThemeToggle.jsx'
import { cx } from '../lib/cx.js'

const NAV = [
  { to: '/', label: 'Cook', icon: 'pot', end: true },
  { to: '/browse', label: 'Browse', icon: 'search' },
  { to: '/favourites', label: 'Saved', icon: 'heart' },
  { to: '/shopping', label: 'List', icon: 'basket' },
]

/*
  App shell: an adire-cloth header, the page, and on phones a bottom tab bar
  (thumbs reach the bottom of a propped-up phone more easily than the top).
  `badges` lets a nav item show a count, e.g. items left on the shopping list.
*/
export function Layout({ badges = {} }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-panel px-4 py-2 font-bold text-ink focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>

      <header className="adire text-[#fbf3e4]">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 rounded-md">
            <span className="grid size-9 place-items-center rounded-full bg-[#d9600f] text-[#fbf3e4]">
              <Icon name="pot" className="size-5" />
            </span>
            <span className="font-display text-xl font-bold tracking-tight">Pepper Pot</span>
          </Link>

          <nav aria-label="Main" className="ml-6 hidden md:block">
            <ul className="flex gap-1">
              {NAV.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cx(
                        'flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold transition-colors',
                        isActive ? 'bg-[#fbf3e4] text-[#22306e]' : 'text-[#fbf3e4]/85 hover:bg-white/10',
                      )
                    }
                  >
                    <Icon name={item.icon} className="size-4" />
                    {item.label}
                    {badges[item.to] > 0 && <Badge count={badges[item.to]} />}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/surprise"
              className="press flex min-h-11 items-center gap-2 rounded-full bg-[#f2c14e] px-3.5 text-sm font-bold text-[#1b1d3a] hover:bg-[#f5cc66] max-[399px]:min-w-11 max-[399px]:justify-center"
            >
              <Icon name="dice" className="size-4" />
              <span className="max-[399px]:sr-only">Surprise me</span>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-28 outline-none md:pb-12">
        <Outlet />
      </main>

      {/* Phone tab bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-panel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="grid grid-cols-4">
          {NAV.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cx(
                    'relative flex flex-col items-center gap-0.5 py-2.5 text-xs font-bold',
                    isActive ? 'text-primary' : 'text-ink-faint',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={cx('rounded-full px-4 py-1', isActive && 'bg-primary-soft')}>
                      <Icon name={item.icon} className="size-5" />
                    </span>
                    {item.label}
                    {badges[item.to] > 0 && (
                      <span className="absolute top-1 left-1/2 ml-3">
                        <Badge count={badges[item.to]} />
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

function Badge({ count }) {
  return (
    <span className="grid min-w-5 place-items-center rounded-full bg-[#b3261e] px-1 text-xs leading-5 font-bold text-white">
      {count}
      <span className="sr-only"> items</span>
    </span>
  )
}
