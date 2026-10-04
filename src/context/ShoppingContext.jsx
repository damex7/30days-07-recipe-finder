import { createContext, useCallback, useContext, useMemo } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import { ingredientKey } from '../lib/normalise.js'

/*
  The shopping list, saved in localStorage.

  Each item is { key, name, done, uses: [{ measure, recipeId, recipeName }] }.
  Items are merged by ingredientKey, so "Onions" from jollof and "onion"
  from egusi become ONE line that remembers both amounts. We keep the
  amounts as text rather than adding them up: "2 medium" + "1, sliced"
  can't be summed honestly.
*/
const ShoppingContext = createContext(null)

export function ShoppingProvider({ children }) {
  const [items, setItems] = useLocalStorage('pepperpot-shopping', [])

  const addItems = useCallback(
    (ingredients, recipe) => {
      const next = items.map((item) => ({ ...item, uses: [...item.uses] }))
      let added = 0
      for (const { name, measure } of ingredients) {
        const key = ingredientKey(name)
        const use = { measure, recipeId: recipe.id, recipeName: recipe.name }
        const existing = next.find((i) => i.key === key)
        if (!existing) {
          next.push({ key, name, done: false, uses: [use] })
          added++
        } else if (!existing.uses.some((u) => u.recipeId === recipe.id)) {
          existing.uses.push(use)
          existing.done = false // you need more of it again
          added++
        }
      }
      setItems(next)
      return added
    },
    [items, setItems],
  )

  const toggle = useCallback((key) => setItems(items.map((i) => (i.key === key ? { ...i, done: !i.done } : i))), [items, setItems])
  const remove = useCallback((key) => setItems(items.filter((i) => i.key !== key)), [items, setItems])
  const clearDone = useCallback(() => setItems(items.filter((i) => !i.done)), [items, setItems])
  const clearAll = useCallback(() => setItems([]), [setItems])
  const has = useCallback((name) => items.some((i) => i.key === ingredientKey(name)), [items])

  const value = useMemo(
    () => ({ items, remaining: items.filter((i) => !i.done).length, addItems, toggle, remove, clearDone, clearAll, has }),
    [items, addItems, toggle, remove, clearDone, clearAll, has],
  )
  return <ShoppingContext.Provider value={value}>{children}</ShoppingContext.Provider>
}

export function useShopping() {
  const ctx = useContext(ShoppingContext)
  if (!ctx) throw new Error('useShopping must be used inside <ShoppingProvider>')
  return ctx
}

/** Plain text for sharing: one line per item still to buy, with amounts. */
export function listAsText(items) {
  const lines = items
    .filter((i) => !i.done)
    .map((i) => {
      const amounts = i.uses.map((u) => u.measure).filter(Boolean)
      return `• ${i.name}${amounts.length ? ` (${amounts.join(' + ')})` : ''}`
    })
  return ['Shopping list (Pepper Pot)', '', ...lines].join('\n')
}
