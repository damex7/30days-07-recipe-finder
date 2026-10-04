import * as api from './mealdb.js'
import { ApiError } from './mealdb.js'
import { LOCAL_RECIPES, findLocalRecipe } from '../data/localRecipes.js'
import { ingredientKey, ingredientMatches } from './normalise.js'
import { LOCAL_INGREDIENTS, STAPLES, pantryKey } from './pantry.js'
import { areaInCuisine, findCuisine } from './cuisines.js'

/*
  The recipe service: the ONLY place that knows there are two sources
  (TheMealDB and our house recipes). Pages call these functions and get
  back one combined, clean list.
*/

export class NotFoundError extends Error {
  constructor(message) {
    super(message)
    this.name = 'NotFoundError'
  }
}

const abortError = () => new DOMException('Aborted', 'AbortError')

// ---------------------------------------------------------------------------
// Ingredient vocabulary
// ---------------------------------------------------------------------------

/*
  Loaded once per visit and shared. Builds:
  - apiNamesByKey: "tomato" -> ["Tomato", "Tomatoes"]. TheMealDB's filter
    needs its exact spelling, and both spellings are used by different
    recipes, so one chip can mean more than one request.
  - suggestions: the API list plus our Nigerian extras, for the chip input.
*/
let indexPromise = null

export function getIngredientIndex() {
  indexPromise ??= api.listIngredients().then(buildIndex, (err) => {
    indexPromise = null // let the next call retry
    throw err
  })
  return indexPromise
}

function buildIndex(apiList) {
  const apiNamesByKey = new Map()
  for (const { name, key } of apiList) {
    if (!apiNamesByKey.has(key)) apiNamesByKey.set(key, [])
    apiNamesByKey.get(key).push(name)
  }
  return { apiNamesByKey, suggestions: mergeSuggestions(apiList) }
}

/** Suggestions to use even if the API list fails to load. */
export const LOCAL_SUGGESTIONS = mergeSuggestions([])

function mergeSuggestions(apiList) {
  const seen = new Set(apiList.map((i) => i.key))
  const local = LOCAL_INGREDIENTS.map((name) => ({ name, key: pantryKey(name), local: true })).filter(
    (s) => !seen.has(s.key),
  )
  return [...local, ...apiList.map((i) => ({ ...i, local: false }))]
}

// ---------------------------------------------------------------------------
// Have / need
// ---------------------------------------------------------------------------

const isStaple = (key) => STAPLES.has(key) || STAPLES.has(key.split(' ').at(-1))

/** Marks each ingredient { ...ingredient, have, staple } against what's in your pantry. */
export function checkIngredients(recipe, pantry) {
  const haveKeys = pantry.map(pantryKey)
  return recipe.ingredients.map((ingredient) => {
    const key = ingredientKey(ingredient.name)
    const staple = isStaple(key)
    return { ...ingredient, staple, have: staple || haveKeys.some((h) => ingredientMatches(h, key)) }
  })
}

/** Which of your pantry items does this recipe use? */
export function pantryItemsUsed(recipe, pantry) {
  const needKeys = recipe.ingredients.map((i) => ingredientKey(i.name))
  return pantry.filter((item) => {
    const have = pantryKey(item)
    return needKeys.some((need) => ingredientMatches(have, need))
  })
}

// ---------------------------------------------------------------------------
// Cook with what I have
// ---------------------------------------------------------------------------

const DETAIL_LIMIT = 12

/*
  1. PLAN    Each chip becomes 0+ API requests (one per exact API spelling).
             Chips the API doesn't know (egusi, palm oil) get none: only
             house recipes can match them.
  2. FETCH   All requests run at once with Promise.allSettled.
             Promise.all would reject the moment ANY request failed and
             we'd lose the results of the ones that worked. allSettled
             waits for all of them and tells us, per request, whether it
             was 'fulfilled' (with a value) or 'rejected' (with a reason).
             So if "tomato" times out, you still get rice and chicken
             results, plus a note that tomato couldn't be checked.
  3. MERGE   A Map keyed by recipe id. A meal found by both "rice" and
             "chicken" appears once, remembering both.
  4. ENRICH  filter.php only gives id/name/photo. For the top results we
             fetch the full recipe (also allSettled, also cached) so we
             can count matches properly and say how many things to buy.
  5. RANK    Most of your ingredients used first; ties go to house
             recipes, then to fewer things to buy, then A–Z.
*/
export async function cookWith(chips, { signal } = {}) {
  const index = await getIngredientIndex().catch(() => null) // no list? fall back to sending chips as typed

  // 1. Plan
  const plans = chips.map((chip) => {
    const key = pantryKey(chip)
    const apiNames = index ? (index.apiNamesByKey.get(key) ?? []).slice(0, 3) : [chip]
    return { chip, apiNames }
  })
  const requests = plans.flatMap(({ chip, apiNames }) => apiNames.map((apiName) => ({ chip, apiName })))

  // 2. Fetch, in parallel
  const settled = await Promise.allSettled(requests.map((r) => api.filterByIngredient(r.apiName, { signal })))
  if (signal?.aborted) throw abortError()

  // 3. Merge
  const byId = new Map()
  const add = (recipe, chip) => {
    const entry = byId.get(recipe.id) ?? { recipe, matched: new Set() }
    entry.matched.add(chip)
    byId.set(recipe.id, entry)
  }

  const failed = new Set()
  settled.forEach((result, i) => {
    if (result.status === 'fulfilled') result.value.forEach((recipe) => add(recipe, requests[i].chip))
    else failed.add(requests[i].chip)
  })

  for (const recipe of LOCAL_RECIPES) {
    for (const chip of pantryItemsUsed(recipe, chips)) add(recipe, chip)
  }

  // Every request failed and nothing local matched: that's an error, not "no results".
  if (byId.size === 0 && requests.length > 0 && failed.size === new Set(requests.map((r) => r.chip)).size) {
    throw settled.find((r) => r.status === 'rejected').reason
  }

  // 4. Enrich the most promising API results with their full details
  const firstPass = [...byId.values()].sort(byMatches)
  const toEnrich = firstPass.filter((e) => !e.recipe.complete).slice(0, DETAIL_LIMIT)
  const details = await Promise.allSettled(toEnrich.map((e) => api.lookupMeal(e.recipe.id, { signal })))
  if (signal?.aborted) throw abortError()
  details.forEach((result, i) => {
    if (result.status !== 'fulfilled' || !result.value) return // keep the summary; the card just shows less
    const entry = toEnrich[i]
    entry.recipe = result.value
    // The filter only matched exact spellings; the full ingredient list can reveal more ("chicken" in "Chicken Thighs").
    for (const chip of pantryItemsUsed(entry.recipe, chips)) entry.matched.add(chip)
  })

  // 5. Rank
  const results = [...byId.values()]
    .map(({ recipe, matched }) => ({
      recipe,
      matched: chips.filter((c) => matched.has(c)), // keep the order you typed them in
      toBuy: recipe.complete ? checkIngredients(recipe, chips).filter((i) => !i.have).length : null,
    }))
    .sort(byMatches)

  return {
    results,
    failed: chips.filter((c) => failed.has(c)),
    houseOnly: plans.filter((p) => index && p.apiNames.length === 0).map((p) => p.chip),
  }
}

function byMatches(a, b) {
  const size = (e) => (e.matched.size ?? e.matched.length)
  const house = (e) => (e.recipe.origin === 'house' ? 0 : 1)
  return (
    size(b) - size(a) ||
    house(a) - house(b) ||
    (a.toBuy ?? 99) - (b.toBuy ?? 99) ||
    a.recipe.name.localeCompare(b.recipe.name)
  )
}

// ---------------------------------------------------------------------------
// Browse: search, category and cuisine, across both sources
// ---------------------------------------------------------------------------

/*
  TheMealDB can only filter by ONE thing per request. To combine "search
  rice" + "Seafood" + "Spanish", we fetch each list and keep only the
  meals present in all of them (an intersection).

  Here we use Promise.all, not allSettled, on purpose: if the Seafood list
  failed, intersecting without it would silently show non-seafood meals.
  A wrong answer is worse than an error with a Retry button.

  A cuisine with several queries (African = 7 countries) is a UNION, and
  there a missing country only makes the list shorter, not wrong, so that
  part uses allSettled.
*/
export async function browse({ q = '', category = '', cuisine = '' }, { signal } = {}) {
  const term = q.trim()
  const cuisineDef = cuisine ? findCuisine(cuisine) : null
  const houseOnlyCuisine = cuisineDef && cuisineDef.queries.length === 0

  // House side: filter locally on every active filter
  const house = LOCAL_RECIPES.filter(
    (r) =>
      (!term || matchesText(r, term)) &&
      (!category || r.category === category) &&
      (!cuisineDef || areaInCuisine(r.area, cuisineDef)),
  )

  // API side
  let apiResults = []
  let failed = []
  if (!houseOnlyCuisine) {
    const parts = []
    if (term) parts.push(api.searchByName(term, { signal }).then((list) => ({ list })))
    if (category) parts.push(api.filterByCategory(category, { signal }).then((list) => ({ list })))
    if (cuisineDef) parts.push(fetchCuisine(cuisineDef, signal))

    const lists = await Promise.all(parts)
    failed = lists.flatMap((l) => l.failed ?? [])
    apiResults = intersect(lists.map((l) => l.list))
  }

  return { results: [...house, ...apiResults], failed }
}

async function fetchCuisine(cuisineDef, signal) {
  const settled = await Promise.allSettled(cuisineDef.queries.map((area) => api.filterByArea(area, { signal })))
  if (signal?.aborted) throw abortError()
  const ok = settled.filter((r) => r.status === 'fulfilled')
  if (ok.length === 0) throw settled[0].reason
  const failed = cuisineDef.queries.filter((_, i) => settled[i].status === 'rejected')
  return { list: unionById(ok.flatMap((r) => r.value)), failed }
}

function unionById(recipes) {
  const byId = new Map()
  for (const r of recipes) byId.set(r.id, richer(byId.get(r.id), r))
  return [...byId.values()]
}

function intersect(lists) {
  if (lists.length === 0) return []
  const [first, ...rest] = lists
  const restMaps = rest.map((list) => new Map(list.map((r) => [r.id, r])))
  return first
    .filter((r) => restMaps.every((m) => m.has(r.id)))
    .map((r) => restMaps.reduce((best, m) => richer(best, m.get(r.id)), r))
}

// Two copies of the same meal (e.g. a search result and a filter summary): keep the more complete one.
function richer(a, b) {
  if (!a) return b
  if (a.complete !== b.complete) return a.complete ? a : b
  return { ...b, ...a, category: a.category ?? b.category, area: a.area ?? b.area }
}

function matchesText(recipe, term) {
  const t = term.toLowerCase()
  return (
    recipe.name.toLowerCase().includes(t) ||
    recipe.tags.some((tag) => tag.toLowerCase().includes(t)) ||
    recipe.ingredients.some((i) => i.name.toLowerCase().includes(t))
  )
}

// ---------------------------------------------------------------------------
// Single recipes
// ---------------------------------------------------------------------------

export async function getRecipe(id, { signal } = {}) {
  if (id.startsWith('house-')) {
    const recipe = findLocalRecipe(id)
    if (!recipe) throw new NotFoundError("We couldn't find that house recipe.")
    return recipe
  }
  const recipe = await api.lookupMeal(id, { signal })
  if (!recipe) throw new NotFoundError("TheMealDB doesn't have a recipe with that id.")
  return recipe
}

/** Roughly 1 in 4 surprises is a house recipe. If the API is down, you still get one of ours. */
export async function surpriseRecipeId({ signal } = {}) {
  const pickLocal = () => LOCAL_RECIPES[Math.floor(Math.random() * LOCAL_RECIPES.length)].id
  if (Math.random() < 0.25) return pickLocal()
  try {
    const recipe = await api.randomMeal({ signal })
    return recipe?.id ?? pickLocal()
  } catch (err) {
    if (signal?.aborted) throw err
    return pickLocal()
  }
}

export function getCategories(opts) {
  return api.listCategories(opts)
}

export { LOCAL_RECIPES, ApiError }
