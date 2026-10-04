import { useEffect, useState } from 'react'

/*
  Keeps the screen on while cook mode is open, using the Screen Wake Lock API.

  How it works:
  1. navigator.wakeLock.request('screen') asks the browser not to dim or
     lock the screen. It returns a WakeLockSentinel: holding it keeps the
     screen on; calling sentinel.release() lets it sleep again.
  2. The browser RELEASES the lock by itself whenever the page is hidden
     (you switch apps, or lock the phone), and does not get it back on its
     own. So we listen for `visibilitychange` and request a new lock when
     the page is visible again.
  3. On unmount (leaving cook mode) we release it, so the phone behaves
     normally everywhere else in the app.

  Where it doesn't work:
  - Older browsers (navigator.wakeLock is missing): status 'unsupported'.
  - Insecure pages: the API only exists over HTTPS or on localhost. Opening
    the dev server from a phone at http://192.168.x.x will NOT have it; the
    deployed https:// Vercel site will.
  - The request can be refused (e.g. battery saver): status 'error'.
  In all these cases cook mode still works; the screen just may dim.

  Returns 'pending' | 'active' | 'released' | 'unsupported' | 'error'.
*/
export function useWakeLock(enabled = true) {
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator
  const [status, setStatus] = useState(supported ? 'pending' : 'unsupported')

  useEffect(() => {
    if (!enabled || !supported) return
    let sentinel = null
    let stopped = false

    async function acquire() {
      try {
        const lock = await navigator.wakeLock.request('screen')
        if (stopped) {
          lock.release() // we left cook mode while the request was in flight
          return
        }
        sentinel = lock
        setStatus('active')
        lock.addEventListener('release', () => {
          if (!stopped) setStatus('released')
        })
      } catch {
        if (!stopped) setStatus('error')
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible' && (!sentinel || sentinel.released)) acquire()
    }

    acquire()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      stopped = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      sentinel?.release().catch(() => {})
    }
  }, [enabled, supported])

  return status
}
