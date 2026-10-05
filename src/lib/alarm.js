/*
  The timer alarm: a short three-note chime from the Web Audio API (no
  sound file to download), repeated every 2 seconds, plus a vibration on
  phones that support it.

  Browsers only let a page play sound after the user has interacted with
  it, so unlockAlarm() is called from the click that starts a timer. By
  the time the timer ends, the audio is allowed.
*/
let ctx = null
let loop = null
let rings = 0

const MAX_RINGS = 30 // stop by itself after about a minute

export function unlockAlarm() {
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
  } catch {
    ctx = null // no Web Audio: the alarm is visual (and vibration) only
  }
}

function note(at, frequency) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = frequency
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(0.35, at + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.28)
  osc.connect(gain).connect(ctx.destination)
  osc.start(at)
  osc.stop(at + 0.3)
}

function ring() {
  navigator.vibrate?.([300, 150, 300])
  if (!ctx || ctx.state !== 'running') return
  const t = ctx.currentTime
  note(t, 880)
  note(t + 0.3, 880)
  note(t + 0.6, 1175)
}

export function startAlarm() {
  if (loop) return
  rings = 0
  ring()
  loop = setInterval(() => {
    ring()
    if (++rings >= MAX_RINGS) stopAlarm()
  }, 2000)
}

export function stopAlarm() {
  clearInterval(loop)
  loop = null
  navigator.vibrate?.(0)
}
