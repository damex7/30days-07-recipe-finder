import { useCallback, useEffect, useState } from 'react'
import { local } from '../lib/storage.js'

/*
  useState that survives a reload. Also listens for the `storage` event,
  which fires when ANOTHER tab changes the same key, so a shopping list
  open in two tabs stays in step.
*/
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => local.get(key, initialValue))

  useEffect(() => {
    local.set(key, value)
  }, [key, value])

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === key) setValue(local.get(key, initialValue))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
    // initialValue is only a fallback; don't resubscribe when callers pass a new [] each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const update = useCallback((next) => setValue(next), [])
  return [value, update]
}
