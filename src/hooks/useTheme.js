import { useCallback, useEffect, useState } from 'react'

export const THEME_KEY = 'pepperpot-theme'

/*
  The inline script in index.html already set data-theme before the first
  paint (saved choice, or the OS preference). We start from that, so React
  and the page agree, then keep <html data-theme> and storage in sync.
*/
export function useTheme() {
  const [theme, setTheme] = useState(() => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'))

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // Storage blocked (private mode): the toggle still works for this visit.
    }
  }, [theme])

  const toggleTheme = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), [])
  return { theme, toggleTheme }
}
