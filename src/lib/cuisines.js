/*
  The cuisine list.

  Why not just use TheMealDB's list.php?a=list? Because on 4 Oct 2026 it
  listed 192 areas but only 29 of them returned any meals ("Nigerian",
  "Indian" and "French" all came back empty). Newer meals store a country
  instead (strCountry: "France"), and filter.php?a= accepts country names
  too. So this list is a snapshot of every name that actually returned
  meals, checked against the live API that day.

  Each cuisine has:
  - id:      what goes in the URL (?a=french)
  - label:   what the UI shows, and the `area` the normaliser uses
  - queries: the filter.php?a= values to fetch. Several queries are fetched
             in parallel and merged (see byCuisine in recipes.js).
  - house:   true if our own house recipes belong here

  Re-check it occasionally: the API is still adding meals.
*/
const AFRICAN_COUNTRIES = ['Algeria', 'Angola', 'Botswana', 'Egypt', 'Kenya', 'Morocco', 'Tunisia']

// [label, country query]
const SNAPSHOT = [
  ['Afghan', 'Afghanistan'],
  ['Albanian', 'Albania'],
  ['Algerian', 'Algeria'],
  ['American', 'United States'],
  ['Andorran', 'Andorra'],
  ['Angolan', 'Angola'],
  ['Argentine', 'Argentina'],
  ['Armenian', 'Armenia'],
  ['Australian', 'Australia'],
  ['Austrian', 'Austria'],
  ['Azerbaijani', 'Azerbaijan'],
  ['Bahamian', 'Bahamas'],
  ['Bangladeshi', 'Bangladesh'],
  ['Barbadian', 'Barbados'],
  ['Belgian', 'Belgium'],
  ['Botswanan', 'Botswana'],
  ['Brazilian', 'Brazil'],
  ['British', 'United Kingdom'],
  ['Bulgarian', 'Bulgaria'],
  ['Cambodian', 'Cambodia'],
  ['Canadian', 'Canada'],
  ['Caymanian', 'Cayman Islands'],
  ['Chilean', 'Chile'],
  ['Chinese', 'China'],
  ['Colombian', 'Colombia'],
  ['Costa Rican', 'Costa Rica'],
  ['Croatian', 'Croatia'],
  ['Cuban', 'Cuba'],
  ['Danish', 'Denmark'],
  ['Dominican', 'Dominica'],
  ['Dutch', 'Netherlands'],
  ['Egyptian', 'Egypt'],
  ['Estonian', 'Estonia'],
  ['Filipino', 'Philippines'],
  ['French', 'France'],
  ['Greek', 'Greece'],
  ['Indian', 'India'],
  ['Irish', 'Ireland'],
  ['Italian', 'Italy'],
  ['Jamaican', 'Jamaica'],
  ['Japanese', 'Japan'],
  ['Kenyan', 'Kenya'],
  ['Laotian', 'Laos'],
  ['Malaysian', 'Malaysia'],
  ['Mexican', 'Mexico'],
  ['Moroccan', 'Morocco'],
  ['Norwegian', 'Norway'],
  ['Polish', 'Poland'],
  ['Portuguese', 'Portugal'],
  ['Russian', 'Russia'],
  ['Saudi Arabian', 'Saudi Arabia'],
  ['Slovak', 'Slovakia'],
  ['Spanish', 'Spain'],
  ['Syrian', 'Syria'],
  ['Thai', 'Thailand'],
  ['Tunisian', 'Tunisia'],
  ['Turkish', 'Turkey'],
  ['Ukrainian', 'Ukraine'],
  ['Uruguayan', 'Uruguay'],
  ['Venezuelan', 'Venezuela'],
  ['Vietnamese', 'Vietnam'],
]

const slug = (s) => s.toLowerCase().replace(/[^a-z]+/g, '-')

export const CUISINES = [
  // Nigerian comes first and is house-only: TheMealDB has no Nigerian meals.
  { id: 'nigerian', label: 'Nigerian', queries: [], house: true, featured: true },
  { id: 'african', label: 'African', queries: AFRICAN_COUNTRIES, house: true, featured: true },
  ...SNAPSHOT.map(([label, country]) => ({ id: slug(label), label, queries: [country], house: false })),
]

export function findCuisine(id) {
  return CUISINES.find((c) => c.id === id) ?? null
}

// "France" or "French" -> "French". Used by the normaliser so `area` is always a cuisine label.
const LABEL_BY_NAME = new Map(SNAPSHOT.flatMap(([label, country]) => [
  [label.toLowerCase(), label],
  [country.toLowerCase(), label],
]))

export function cuisineLabel(areaOrCountry) {
  if (!areaOrCountry) return null
  const name = String(areaOrCountry).trim()
  return LABEL_BY_NAME.get(name.toLowerCase()) ?? name
}

const AFRICAN_LABELS = new Set(['Nigerian', ...AFRICAN_COUNTRIES.map(cuisineLabel)])

/** Does a recipe's area belong in this cuisine? Used to filter house recipes and full API meals locally. */
export function areaInCuisine(area, cuisine) {
  if (!area || !cuisine) return false
  if (cuisine.id === 'african') return AFRICAN_LABELS.has(area)
  return area === cuisine.label
}

/** "French" -> the French cuisine entry, for linking a recipe's area to Browse. */
export function findCuisineByLabel(label) {
  return CUISINES.find((c) => c.label === label) ?? null
}
