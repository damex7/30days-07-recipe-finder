/*
  Finds cooking times in a step's text, so cook mode can offer a one-tap
  timer: "Simmer for 20 minutes" -> a 20 minute timer.

  Handles the ways recipes write times: "20 minutes", "10–15 mins",
  "2 more minutes", "a minute or two", "30 seconds", "another hour",
  "1½ hours", "1 hour 30 mins", "4–5 minutes a side".

  For a range the timer is set to the SHORTER time: it's easier to give
  food a few more minutes than to un-burn it. `extra` holds the rest of the
  range, so the finished timer can offer "+5 min".
*/

const WORDS = {
  a: 1, an: 1, one: 1, another: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40, 'forty-five': 45,
}
// Longest first, so "another" is tried before "an"
const WORD_PATTERN = Object.keys(WORDS).sort((a, b) => b.length - a.length).join('|')
const NUM = String.raw`\d+(?:[.,]\d+)?½?|${WORD_PATTERN}`
const UNIT = String.raw`seconds?|secs?|minutes?|mins?|hours?|hrs?`

const TIME = new RegExp(
  String.raw`\b(${NUM})(?:\s*(?:–|—|-|to)\s*(${NUM}))?\s*(?:more\s+|extra\s+)?(${UNIT})\b` + // 10–15 more minutes
    String.raw`(?:\s+or\s+(two))?` + // a minute or two
    String.raw`(?:\s*(?:and\s+)?(\d+)\s*(?:minutes?|mins?)\b)?` + // 1 hour 30 mins
    String.raw`(\s+(?:a|per|each)\s+side)?`, // 4 minutes a side
  'gi',
)

const UNIT_SECONDS = { s: 1, m: 60, h: 3600 }

function toNumber(text) {
  const word = WORDS[text.toLowerCase()]
  if (word) return word
  const half = text.endsWith('½') ? 0.5 : 0
  return (parseFloat(text.replace(',', '.')) || 0) + half
}

/** [{ seconds, extra, label, note, spoken }] for each time in the text, in order. */
export function findTimes(text) {
  const normalised = text.replace(/\bhalf an hour\b/gi, '30 minutes').replace(/\ban hour and a half\b/gi, '90 minutes')
  const found = []
  for (const m of normalised.matchAll(TIME)) {
    const [, lowText, highText, unit, orTwo, plusMinutes, side] = m
    const perUnit = UNIT_SECONDS[unit[0].toLowerCase()]
    const bonus = perUnit === 3600 && plusMinutes ? Number(plusMinutes) * 60 : 0
    const low = Math.round(toNumber(lowText) * perUnit + bonus)
    const highValue = highText ? toNumber(highText) : orTwo ? 2 : null
    const high = highValue ? Math.round(highValue * perUnit + bonus) : low

    if (low < 10 || low > 12 * 3600 || high < low) continue
    if (found.some((f) => f.seconds === low && f.extra === high - low)) continue

    const range = high > low ? formatRange(low, high) : ''
    const sideText = side ? side.trim() : ''
    found.push({
      seconds: low,
      extra: high - low,
      label: formatDuration(low),
      note: [range, sideText].filter(Boolean).join(' '),
      spoken: spokenDuration(low),
    })
  }
  return found
}

/** 90 -> "1 min 30 sec", 1200 -> "20 min", 5400 -> "1 hr 30 min" */
export function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h && `${h} hr`, m && `${m} min`, s && `${s} sec`].filter(Boolean).join(' ') || '0 sec'
}

function formatRange(low, high) {
  if (low % 60 === 0 && high % 60 === 0 && high < 3600 * 2) return `${low / 60}–${high / 60} min`
  if (low % 3600 === 0 && high % 3600 === 0) return `${low / 3600}–${high / 3600} hr`
  return `${formatDuration(low)}–${formatDuration(high)}`
}

/** For screen readers: 1200 -> "20 minute", as in "a 20 minute timer" */
export function spokenDuration(seconds) {
  return formatDuration(seconds).replace('hr', 'hour').replace('min', 'minute').replace('sec', 'second')
}

/** Milliseconds left -> "4:05" or "1:02:09" */
export function formatClock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = String(total % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}
