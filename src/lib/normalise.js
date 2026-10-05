import { cuisineLabel } from './cuisines.js'

/*
  The adapter: TheMealDB's shape in, OUR shape out.

  A raw TheMealDB meal has ~55 fields: strIngredient1..20 and
  strMeasure1..20 (empty ones are "", " " or null), instructions as one
  long string, tags as "Soup,Spicy", a full YouTube URL, and since 2025
  sometimes strArea: null with the country in strCountry instead.

  Every recipe in the app, from either source, has exactly this shape:

  {
    id, name, category, area,
    image, thumb,                  // full photo + small version (or null)
    credit?,                       // house photos only: { author, license, licenseUrl, source }
    tags: [string],
    ingredients: [{ name, measure }],
    steps: [string],
    youtube,                       // the 11-character video id, or null
    source,                        // original recipe URL, or null
    origin: 'api' | 'house',
    complete,                      // false for list results (filter.php) that only have id/name/image
  }

  Why it matters: the API's quirks are handled in ONE file. Components
  never check for strIngredient7 or split strings; our hand-written
  Nigerian recipes are written straight in this shape; and if we ever
  switch to another API, only a new adapter is needed, not new components.
*/

const clean = (value) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '')

export function normaliseMeal(raw) {
  const ingredients = []
  for (let i = 1; i <= 20; i++) {
    const name = clean(raw[`strIngredient${i}`])
    if (!name) continue // most of the 20 slots are empty
    ingredients.push({ name, measure: clean(raw[`strMeasure${i}`]) })
  }

  const image = clean(raw.strMealThumb) || null

  return {
    id: String(raw.idMeal),
    name: clean(raw.strMeal),
    category: clean(raw.strCategory) || null,
    area: cuisineLabel(clean(raw.strArea) || clean(raw.strCountry)) || null,
    image,
    thumb: image ? `${image}/small` : null,
    tags: clean(raw.strTags)
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    ingredients,
    steps: parseSteps(raw.strInstructions),
    youtube: parseYoutube(raw.strYoutube),
    source: clean(raw.strSource) || null,
    origin: 'api',
    complete: true,
  }
}

/** filter.php only returns { idMeal, strMeal, strMealThumb } (plus area/country sometimes). */
export function normaliseSummary(raw) {
  const image = clean(raw.strMealThumb) || null
  return {
    id: String(raw.idMeal),
    name: clean(raw.strMeal),
    category: clean(raw.strCategory) || null,
    area: cuisineLabel(clean(raw.strArea) || clean(raw.strCountry)) || null,
    image,
    thumb: image ? `${image}/small` : null,
    tags: [],
    ingredients: [],
    steps: [],
    youtube: null,
    source: null,
    origin: 'api',
    complete: false,
  }
}

/*
  Instructions arrive in three styles:
    "Preheat oven...\r\nCombine soy sauce...\r\n"      (one step per line)
    "STEP 1\r\nPat out some rice...\r\n\r\nSTEP 2\r\n..." (headed steps)
    "1. Heat the oil. 2. Add..." or one huge paragraph
  We split on line breaks, drop "STEP n" headings and leading numbers, and
  if all we got was one wall of text, break it into short groups of
  sentences so cook mode never shows a whole page as "step 1".
*/
export function parseSteps(text) {
  if (typeof text !== 'string') return []
  const lines = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) =>
      line
        .replace(/^\s*(step\s*\d+\s*[:.)\-–]?\s*)/i, '') // "STEP 1 - "
        .replace(/^\s*\d+\s*[.)]\s+/, '') // "1. " or "1) "
        .replace(/^\s*[•▪\-–]\s+/, '') // bullets
        .trim(),
    )
    .filter((line) => line && !/^\d+$/.test(line))

  if (lines.length === 1 && lines[0].length > 320) return chunkSentences(lines[0])
  return lines
}

function chunkSentences(paragraph, max = 260) {
  const sentences = paragraph.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) ?? [paragraph]
  const chunks = []
  let current = ''
  for (const sentence of sentences) {
    const s = sentence.trim()
    if (current && (current + ' ' + s).length > max) {
      chunks.push(current)
      current = s
    } else {
      current = current ? current + ' ' + s : s
    }
  }
  if (current) chunks.push(current)
  return chunks
}

/** "https://www.youtube.com/watch?v=4aZr5hZXP_s" -> "4aZr5hZXP_s" (also handles youtu.be links). */
export function parseYoutube(url) {
  const match = clean(url).match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/)
  return match ? match[1] : null
}

/*
  ingredientKey: a comparison form for ingredient names, so "Tomatoes",
  "tomato" and "chopped_tomato" can be compared. Lowercase, accents
  removed, (notes in brackets) dropped, punctuation to spaces, and each
  word made singular. "Black-eyed beans (soaked)" -> "black eyed bean".
*/
export function ingredientKey(name) {
  return String(name ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // ọ -> o, é -> e
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(singular)
    .join(' ')
}

const IRREGULAR = { leaves: 'leaf', loaves: 'loaf', halves: 'half', knives: 'knife' }

function singular(word) {
  if (IRREGULAR[word]) return IRREGULAR[word]
  if (word.length <= 3) return word
  if (/(ss|us|is)$/.test(word)) return word // couscous, hummus, swiss
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y' // berries
  if (/oes$/.test(word)) return word.slice(0, -2) // tomatoes, potatoes
  if (/(ch|sh|x)es$/.test(word)) return word.slice(0, -2) // peaches, radishes
  if (word.endsWith('s')) return word.slice(0, -1) // onions, beans
  return word
}

/*
  Does an ingredient you HAVE cover one a recipe NEEDS? Both are keys.

  - Same key: yes.
  - What you have is a more specific version ("basmati rice" covers "rice").
  - What you have is more general ("chicken" covers "chicken breast")...
    unless the recipe's last word turns it into a different product:
    having chicken doesn't mean you have chicken STOCK.
  It's a heuristic, so it will sometimes be wrong; the recipe page lets
  you see exactly what it decided.
*/
const PRODUCT_WORDS = new Set([
  'stock', 'broth', 'sauce', 'paste', 'puree', 'powder', 'flour', 'vinegar', 'milk', 'cream', 'juice',
  'wine', 'cube', 'oil', 'noodle', 'flake', 'seed', 'extract', 'syrup', 'butter', 'cheese', 'water', 'leaf',
])

export function ingredientMatches(haveKey, needKey) {
  if (!haveKey || !needKey) return false
  if (haveKey === needKey) return true
  const have = haveKey.split(' ')
  const need = needKey.split(' ')
  if (endsWithWords(have, need)) return true
  if (containsWords(need, have)) {
    const last = need[need.length - 1]
    return !PRODUCT_WORDS.has(last) || have[have.length - 1] === last
  }
  return false
}

function endsWithWords(words, tail) {
  return tail.length <= words.length && tail.every((w, i) => words[words.length - tail.length + i] === w)
}

function containsWords(words, part) {
  for (let i = 0; i + part.length <= words.length; i++) {
    if (part.every((w, k) => words[i + k] === w)) return true
  }
  return false
}
