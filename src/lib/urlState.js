/*
  Helpers for keeping page state in the URL (?i=rice,tomato&c=Seafood).
  State in the URL can be shared, bookmarked and survives a refresh.
*/

/** "rice, Tomato,,rice" -> ["rice", "tomato"] (trimmed, lowercased, no blanks or repeats). */
export function parseList(value) {
  if (!value) return []
  return [...new Set(value.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean))]
}

/** Copy of `params` with `changes` applied; empty values are removed so URLs stay tidy. */
export function withParams(params, changes) {
  const next = new URLSearchParams(params)
  for (const [key, value] of Object.entries(changes)) {
    if (value == null || value === '') next.delete(key)
    else next.set(key, value)
  }
  return next
}
