import { useCallback, useEffect, useMemo, useState } from 'react'
import { session } from '../lib/storage.js'
import { startAlarm, stopAlarm, unlockAlarm } from '../lib/alarm.js'

/*
  Kitchen timers for cook mode. Several can run at once (rice simmering
  while the stew fries), and they keep going as you move between steps.

  Each timer stores the moment it ends (endsAt), not a countdown, so it
  stays accurate when the browser slows background tabs or the page is
  refreshed (timers are kept in sessionStorage per recipe).

  A timer is running ({ endsAt }), paused ({ left }) or done ({ done }).
  Done timers ring until you stop them or add more time.
*/
export function useCookTimers(recipeId) {
  const key = `pepperpot-timers-${recipeId}`
  const [timers, setTimers] = useState(() => session.get(key, []))
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    session.set(key, timers)
  }, [key, timers])

  const anyRunning = timers.some((t) => t.endsAt && !t.done)
  useEffect(() => {
    if (!anyRunning) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [anyRunning])

  // A running timer whose end has passed becomes done
  useEffect(() => {
    if (timers.some((t) => t.endsAt && !t.done && t.endsAt <= now)) {
      setTimers((ts) => ts.map((t) => (t.endsAt && !t.done && t.endsAt <= now ? { ...t, done: true, endsAt: null } : t)))
    }
  }, [now, timers])

  const ringing = timers.some((t) => t.done)
  useEffect(() => {
    if (ringing) startAlarm()
    else stopAlarm()
  }, [ringing])
  useEffect(() => stopAlarm, [])

  const change = (id, fn) => setTimers((ts) => ts.map((t) => (t.id === id ? fn(t) : t)))

  const start = useCallback(({ key: timerKey, label, step, seconds, extra = 0 }) => {
    unlockAlarm()
    const at = Date.now()
    setNow(at)
    setTimers((ts) => [
      ...ts,
      { id: `${at}-${Math.random().toString(36).slice(2, 7)}`, key: timerKey, label, step, total: seconds * 1000, endsAt: at + seconds * 1000, extra },
    ])
  }, [])

  const pause = useCallback((id) => change(id, (t) => ({ ...t, left: Math.max(0, t.endsAt - Date.now()), endsAt: null })), [])

  const resume = useCallback((id) => {
    unlockAlarm()
    setNow(Date.now())
    change(id, (t) => ({ ...t, endsAt: Date.now() + t.left, left: null }))
  }, [])

  // +1 min on a running/paused timer, or a snooze on a finished one
  const addTime = useCallback((id, seconds) => {
    unlockAlarm()
    setNow(Date.now())
    change(id, (t) => {
      const ms = seconds * 1000
      if (t.done) return { ...t, done: false, endsAt: Date.now() + ms, total: ms, extra: 0 }
      if (t.endsAt) return { ...t, endsAt: t.endsAt + ms, total: t.total + ms }
      return { ...t, left: t.left + ms, total: t.total + ms }
    })
  }, [])

  const remove = useCallback((id) => setTimers((ts) => ts.filter((t) => t.id !== id)), [])

  const remaining = useCallback((t) => (t.done ? 0 : t.endsAt ? Math.max(0, t.endsAt - now) : t.left), [now])

  return useMemo(
    () => ({ timers, remaining, anyRunning, start, pause, resume, addTime, remove }),
    [timers, remaining, anyRunning, start, pause, resume, addTime, remove],
  )
}
