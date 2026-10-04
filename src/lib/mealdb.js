import { normaliseMeal, normaliseSummary, ingredientKey } from './normalise.js'
import { session } from './storage.js'

/*
  Every TheMealDB request lives in this file. Nothing outside src/lib ever
  sees a raw API object: each endpoint function returns the clean recipe
  shape from normalise.js.

  "1" is TheMealDB's free test key. It's public by design (they publish it
  in their docs), so it's fine in browser code.
*/
const BASE = 'https://www.themealdb.com/api/json/v1/1/'
const TIMEOUT_MS = 12000
// Bump when normalise.js changes, so old cached shapes are ignored.
const CACHE_VERSION = 'mealdb:v1:'

export class ApiError extends Error {
  constructor(message, { status, retryable = false } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.retryable = retryable
  }
}

/*
  The one place we call fetch. It:
  - turns every failure into an ApiError with a message a person can read,
  - gives up after TIMEOUT_MS so a stalled request can't spin forever,
  - caches the result in sessionStorage, keyed by path. The cache lasts as
    long as the tab, which suits recipes (they rarely change) and means
    going Back is instant and doesn't spend the API's request budget.

  - retries ONCE, after a short pause, when the failure looks temporary (the
    connection dropped, a 5xx, or 429 "too many requests"). In testing,
    one in a few bursts of parallel requests had a dropped connection that
    worked fine a moment later. A 404 or bad JSON is not retried: asking
    again would get the same answer.

  `select` shrinks the response BEFORE it's cached: we store what we keep,
  not the whole payload (the ingredient list is ~1 MB raw, ~40 KB selected).
*/
export async function request(path, { signal, cache = true, select = (json) => json } = {}) {
  const cacheKey = CACHE_VERSION + path
  if (cache) {
    const hit = session.get(cacheKey, undefined)
    if (hit !== undefined) return hit
  }

  let data
  try {
    data = await fetchOnce(path, signal, select)
  } catch (err) {
    if (signal?.aborted || !err.retryable) throw err
    await wait(700, signal)
    data = await fetchOnce(path, signal, select)
  }

  if (cache) session.set(cacheKey, data) // fails quietly if storage is full
  return data
}

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    const id = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(id)
      reject(signal.reason)
    })
  })
}

async function fetchOnce(path, signal, select) {
  const timeout = AbortSignal.timeout(TIMEOUT_MS)
  const combined = signal && AbortSignal.any ? AbortSignal.any([signal, timeout]) : (signal ?? timeout)

  let res
  try {
    res = await fetch(BASE + path, { signal: combined })
  } catch (err) {
    if (signal?.aborted) throw err // the caller cancelled: not an error to show
    if (err.name === 'TimeoutError' || timeout.aborted) {
      throw new ApiError('TheMealDB took too long to answer. Try again.', { retryable: true })
    }
    throw new ApiError("Couldn't reach TheMealDB. Check your connection and try again.", { retryable: true })
  }

  if (res.status === 429) {
    throw new ApiError('TheMealDB is busy right now. Wait a few seconds and retry.', { status: 429, retryable: true })
  }
  if (!res.ok) {
    throw new ApiError(`TheMealDB returned an error (${res.status}).`, { status: res.status, retryable: res.status >= 500 })
  }

  let json
  try {
    json = await res.json()
  } catch {
    // Rate-limited or broken responses sometimes come back as HTML.
    throw new ApiError('TheMealDB sent back something unexpected. Try again.', { status: res.status })
  }
  return select(json)
}

// TheMealDB says "nothing found" as { meals: null } (and sometimes the string "no data found").
const meals = (json) => (Array.isArray(json?.meals) ? json.meals : [])
const q = encodeURIComponent

// ---- Endpoints: each returns clean data ----

/** Full recipes whose name contains `term`. */
export function searchByName(term, opts) {
  return request(`search.php?s=${q(term)}`, { ...opts, select: (j) => meals(j).map(normaliseMeal) })
}

/** One full recipe, or null. */
export function lookupMeal(id, opts) {
  return request(`lookup.php?i=${q(id)}`, { ...opts, select: (j) => meals(j).map(normaliseMeal)[0] ?? null })
}

/** A random full recipe. Never cached, or it would always be the same one. */
export function randomMeal(opts) {
  return request('random.php', { ...opts, cache: false, select: (j) => meals(j).map(normaliseMeal)[0] ?? null })
}

/** Summaries (id, name, image) of meals that use this exact API ingredient name. */
export function filterByIngredient(apiName, opts) {
  return request(`filter.php?i=${q(apiName.replace(/ /g, '_'))}`, { ...opts, select: (j) => meals(j).map(normaliseSummary) })
}

export function filterByCategory(category, opts) {
  return request(`filter.php?c=${q(category)}`, {
    ...opts,
    select: (j) => meals(j).map((m) => normaliseSummary({ ...m, strCategory: category })),
  })
}

/** `area` can be a cuisine ("Turkish") or, since 2025, a country ("Turkey"). */
export function filterByArea(area, opts) {
  return request(`filter.php?a=${q(area)}`, { ...opts, select: (j) => meals(j).map(normaliseSummary) })
}

export function listCategories(opts) {
  return request('list.php?c=list', { ...opts, select: (j) => meals(j).map((c) => c.strCategory).filter(Boolean) })
}

/** All ~1,000 ingredient names, as { name, key }. */
export function listIngredients(opts) {
  return request('list.php?i=list', {
    ...opts,
    select: (j) =>
      meals(j)
        .map((i) => i.strIngredient?.trim())
        .filter(Boolean)
        .map((name) => ({ name, key: ingredientKey(name) })),
  })
}
