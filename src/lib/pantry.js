import { ingredientKey } from './normalise.js'

/*
  Pantry vocabulary that TheMealDB doesn't have.

  TheMealDB's ingredient list has ~1,000 entries but none of palm oil,
  egusi, crayfish, iru, ugu, ogbono, okra or garri. Without these you
  couldn't even type the ingredients for half of Nigerian cooking, so we
  add them to the suggestions. They match our house recipes; we don't ask
  the API about them because it would always answer "nothing".
*/
export const LOCAL_INGREDIENTS = [
  'Palm oil',
  'Egusi',
  'Crayfish',
  'Locust beans',
  'Ugu leaves',
  'Bitter leaf',
  'Ogbono',
  'Okra',
  'Garri',
  'Stockfish',
  'Smoked fish',
  'Black-eyed beans',
  'Uziza leaves',
  'Scent leaf',
  'Yaji (suya spice)',
  'Kuli kuli',
  'Ofada rice',
  'Pounded yam flour',
  'Semovita',
  'Ponmo (cow skin)',
  'Assorted meat',
  'Ewedu leaves',
  'Green bell pepper',
  'Dried chilli flakes',
  'Bouillon cubes',
  'Groundnut oil',
  'Uda seeds',
  'Tatashe (red bell pepper)',
  'Ata rodo (scotch bonnet)',
  'Plantain',
]

/*
  Everyday names → the name recipes use. Applied to what YOU type, never
  to recipe ingredients. Example: in a Nigerian kitchen "pepper" means
  fresh chilli (ata rodo), but a British recipe's "pepper" is black pepper,
  so we must only translate your side. Keys and values are ingredientKey()
  forms (lowercase, singular).
*/
export const ALIASES = {
  pepper: 'scotch bonnet',
  'ata rodo': 'scotch bonnet',
  rodo: 'scotch bonnet',
  tatashe: 'red pepper',
  'red bell pepper': 'red pepper',
  groundnut: 'peanut',
  'groundnut oil': 'peanut oil',
  iru: 'locust bean',
  dawadawa: 'locust bean',
  bean: 'black eyed bean',
  'honey bean': 'black eyed bean',
  oloyin: 'black eyed bean',
  cowpea: 'black eyed bean',
  yam: 'white yam',
  maggi: 'bouillon cube',
  knorr: 'bouillon cube',
  'seasoning cube': 'bouillon cube',
  'stock cube': 'bouillon cube',
  'melon seed': 'egusi',
  'ground egusi': 'egusi',
  'tomato paste': 'tomato puree',
  'irish potato': 'potato',
  scallion: 'spring onion',
  cilantro: 'coriander',
  'suya spice': 'yaji',
  ugu: 'ugu leaf',
  'pumpkin leaf': 'ugu leaf',
  'dried fish': 'smoked fish',
}

/*
  Things we assume every kitchen has, so they're never "need" and never
  added to the shopping list.
*/
export const STAPLES = new Set(['water', 'salt'])

/** The comparison key for something YOU have: ingredientKey plus everyday aliases. */
export function pantryKey(name) {
  const key = ingredientKey(name)
  return ALIASES[key] ?? key
}
