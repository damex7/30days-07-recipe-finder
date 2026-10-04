import { createContext, useCallback, useContext, useMemo } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import { pantryKey } from '../lib/pantry.js'

/*
  The pantry: the ingredients you said you have. The home page keeps them
  in the URL (?i=rice,tomato) so a search can be shared; this context
  remembers them in localStorage so the recipe page can mark what you
  have, and so they're still there tomorrow.
*/
const PantryContext = createContext(null)

export function PantryProvider({ children }) {
  const [pantry, setPantry] = useLocalStorage('pepperpot-pantry', [])

  const has = useCallback((name) => pantry.some((p) => pantryKey(p) === pantryKey(name)), [pantry])

  const value = useMemo(() => ({ pantry, setPantry, has }), [pantry, setPantry, has])
  return <PantryContext.Provider value={value}>{children}</PantryContext.Provider>
}

export function usePantry() {
  const ctx = useContext(PantryContext)
  if (!ctx) throw new Error('usePantry must be used inside <PantryProvider>')
  return ctx
}
