import { useTheme } from '../hooks/useTheme.js'
import { Icon } from './Icon.jsx'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const dark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={dark}
      className="grid size-11 place-items-center rounded-full text-[#fbf3e4] hover:bg-white/10"
    >
      <Icon name={dark ? 'moon' : 'sun'} />
      <span className="sr-only">Dark mode</span>
    </button>
  )
}
