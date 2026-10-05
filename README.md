# Pepper Pot · Cook with what you have

Day 7 of my 30-day development challenge: a recipe finder that starts from your kitchen, not from a dish name.

Tell it _"I have rice, tomatoes and chicken"_ and it ranks recipes by how many of your ingredients they use, shows what you'd still need to buy, and builds a shopping list. It includes **16 Nigerian house recipes**, because TheMealDB doesn't have any.

**Today's focus:** combining and cleaning API data. That means parallel requests with `Promise.all` / `Promise.allSettled`, merging and ranking results, and normalising messy API fields into one clean shape.

## Features

- **Cook with what I have:** add ingredients as chips, with suggestions from TheMealDB's ~1,000 ingredients plus a Nigerian pantry list (palm oil, egusi, crayfish, iru, ugu…). Each card shows "Uses 3 of your 4 ingredients" and how many more you'd need to buy.
- **Browse:** search by name, filter by category and cuisine, or combine all three. Nigerian and African are featured cuisines.
- **Recipe page:** photo, ingredients marked **Have**, **Need** or **Staple** against your pantry, numbered steps, and the YouTube video if there is one.
- **Cook mode:** full-screen, large text, one step at a time, with Back/Next buttons and ← → keys. It keeps the screen awake while you cook. When a step mentions a time ("simmer for 20 minutes") there's a one-tap timer for it, and you can set your own; several timers can run at once and they ring when done.
- **Favourites and shopping list,** saved on your device. The shopping list merges duplicates, lets you tick items off, and can be shared or copied as text.
- **Surprise me:** a random recipe, about one in four from the house kitchen.
- **Shareable URLs:** your ingredients, search and filters live in the URL, e.g. `/?i=rice,tomato,chicken` or `/browse?c=Seafood&a=spanish`.
- **Built for the kitchen:**
  - Responsive down to 360px, with a bottom tab bar on phones.
  - Light and dark mode that's remembered.
  - Keyboard accessible, with lazy-loaded images and designed placeholders.

## Run it

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build in dist/
npm run preview   # serve the build locally
```

No API key is needed: TheMealDB's free test key (`1`) is public by design.

**Testing cook mode on a phone:** the Screen Wake Lock API only works on secure pages (HTTPS or `localhost`). If you open the dev server from your phone at `http://192.168.x.x:5173` (via `npm run dev -- --host`), cook mode works but the screen may dim. On the deployed Vercel site (HTTPS), the screen stays on.

## Deploying to Vercel

Import the repo in Vercel; it detects Vite automatically. `vercel.json` rewrites every path to `index.html`, so refreshing `/recipe/52772` or a shared `/browse?...` link loads the app instead of a 404.

## How the two recipe sources are combined

```
TheMealDB (raw, messy) ──► mealdb.js ──► normalise.js ──┐
                           request()     clean shape    ├──► recipes.js ──► pages
data/localRecipes.js  (already in the clean shape) ─────┘    merge, rank,
                                                              filter
```

1. **One clean shape.** Every recipe, from either source, looks like this:

   ```js
   { id, name, category, area, image, thumb, tags: [],
     ingredients: [{ name, measure }], steps: [], youtube, source,
     origin: 'api' | 'house', complete }
   ```

   `normalise.js` turns TheMealDB's 20 `strIngredient`/`strMeasure` slots, its one long instruction string, its comma-separated tags, its YouTube URL and its `strArea` / `strCountry` fields into this shape. The house recipes are written in this shape directly.

   **Why this "adapter" matters:** the API's quirks are handled in one file. Components never deal with `strIngredient7` or `{ meals: null }`. Our own recipes plug in without special cases, and swapping to another API would only need a new adapter.

2. **One service, `recipes.js`, knows there are two sources.** Pages call `cookWith()`, `browse()` or `getRecipe()` and get one combined list. House recipes are matched locally with the same rules used for API recipes, so search, filters and "cook with what I have" work across both.

3. **Cook with what I have:**
   1. Each ingredient becomes one or more requests to `filter.php?i=` (one per exact TheMealDB spelling, e.g. "Tomato" and "Tomatoes").
   2. They all run at once with **`Promise.allSettled`**. If one fails, the others' results are kept, and the page says which ingredient couldn't be checked, with a Retry button. Plain `Promise.all` would reject on the first failure and throw away the rest.
   3. Results are **merged** in a `Map` keyed by recipe id, so a meal found by "rice" and "chicken" appears once and remembers both.
   4. The top 12 are **enriched** with their full details, so matches are counted properly and "+N to buy" can be shown.
   5. Results are **ranked**: most of your ingredients first, then house recipes, then fewest things to buy.

   Ingredients TheMealDB doesn't know (egusi, palm oil) aren't sent to the API at all. Only house recipes can match them.

4. **Browse filters intersect.** TheMealDB can only filter by one thing per request, so "Seafood + Spanish" fetches both lists and keeps the meals present in both. This uses **`Promise.all` on purpose**: if one list failed, intersecting without it would show wrong results, not just fewer. The **African** cuisine is the opposite case. It's a union of 7 countries using `allSettled`, because a missing country only shortens the list.

### What I found in TheMealDB's data

- It lists **"Nigerian" as an area but returns no Nigerian meals**, and a search for "jollof" finds nothing. That's why the house recipes exist.
- Only **29 of the 192 listed areas** return meals. Newer meals store a country instead (`strArea: null, strCountry: "Belgium"`), and `filter.php?a=` accepts country names too. `cuisines.js` is a snapshot of the 61 cuisines that actually returned meals on 4 Oct 2026.
- Empty ingredient slots can be `""`, `" "` or `null`. Instructions come as lines, as "STEP 1" blocks, or as one long paragraph.
- Many Nigerian ingredients (palm oil, egusi, crayfish, iru, ugu, ogbono, okra, garri) aren't in its ingredient list, so the app adds them as suggestions.

## Where each concept lives

| Concept | File |
| --- | --- |
| One `request()` with errors, timeout, retry and sessionStorage cache | [src/lib/mealdb.js](src/lib/mealdb.js) |
| Normaliser / adapter (raw API → clean shape) | [src/lib/normalise.js](src/lib/normalise.js) |
| Ingredient matching (plurals, "have" covers "need") | [src/lib/normalise.js](src/lib/normalise.js) (`ingredientKey`, `ingredientMatches`) |
| `Promise.allSettled`: parallel fetch, merge, rank | [src/lib/recipes.js](src/lib/recipes.js) (`cookWith`) |
| `Promise.all` and intersection for combined filters | [src/lib/recipes.js](src/lib/recipes.js) (`browse`) |
| Union of several queries (African cuisine) | [src/lib/recipes.js](src/lib/recipes.js) (`fetchCuisine`) |
| Nigerian house recipes in the clean shape | [src/data/localRecipes.js](src/data/localRecipes.js) |
| House recipe photos (Wikimedia Commons, CC BY-SA) and their credits | [src/data/dishPhotos.js](src/data/dishPhotos.js), [public/dishes/](public/dishes/) |
| Illustrated SVG tiles, the fallback for a dish with no photo | [src/data/dishArt.js](src/data/dishArt.js) |
| Cuisine snapshot (country names, Nigerian, African) | [src/lib/cuisines.js](src/lib/cuisines.js) |
| Nigerian pantry words and aliases (pepper → scotch bonnet) | [src/lib/pantry.js](src/lib/pantry.js) |
| Loading / error / retry state with request cancelling | [src/hooks/useAsync.js](src/hooks/useAsync.js) |
| State in the URL (ingredients, search, filters, cook step) | [src/lib/urlState.js](src/lib/urlState.js), [src/pages/Home.jsx](src/pages/Home.jsx), [src/pages/Browse.jsx](src/pages/Browse.jsx) |
| Screen Wake Lock API | [src/hooks/useWakeLock.js](src/hooks/useWakeLock.js) |
| Cook mode (keyboard, full screen, one step at a time) | [src/pages/CookMode.jsx](src/pages/CookMode.jsx) |
| Step timers: times found in the step text, several at once, Web Audio alarm | [src/lib/timers.js](src/lib/timers.js), [src/hooks/useCookTimers.js](src/hooks/useCookTimers.js), [src/components/CookTimers.jsx](src/components/CookTimers.jsx), [src/lib/alarm.js](src/lib/alarm.js) |
| localStorage persistence (synced across tabs) | [src/hooks/useLocalStorage.js](src/hooks/useLocalStorage.js), [src/lib/storage.js](src/lib/storage.js) |
| Favourites | [src/context/FavouritesContext.jsx](src/context/FavouritesContext.jsx), [src/pages/Favourites.jsx](src/pages/Favourites.jsx) |
| Shopping list merging, Web Share API, clipboard | [src/context/ShoppingContext.jsx](src/context/ShoppingContext.jsx), [src/pages/Shopping.jsx](src/pages/Shopping.jsx) |
| Have / need against your pantry | [src/lib/recipes.js](src/lib/recipes.js) (`checkIngredients`), [src/pages/Recipe.jsx](src/pages/Recipe.jsx) |
| Accessible combobox (chips + suggestions) | [src/components/IngredientInput.jsx](src/components/IngredientInput.jsx) |
| Lazy images, `srcset`, designed fallback | [src/components/SafeImage.jsx](src/components/SafeImage.jsx) |
| Skeletons, error with Retry, empty states | [src/components/States.jsx](src/components/States.jsx) |
| Design tokens (`@theme`) and dark mode | [src/index.css](src/index.css), [src/hooks/useTheme.js](src/hooks/useTheme.js) |
| SPA rewrite for Vercel | [vercel.json](vercel.json) |

## Stack

Vite, React 19 (JavaScript), Tailwind CSS v4 (`@tailwindcss/vite`, tokens in `@theme`) and react-router-dom. No other libraries.

## Photo credits

The house recipe photos come from [Wikimedia Commons](https://commons.wikimedia.org/) and are used under Creative Commons Attribution-ShareAlike licences (CC BY-SA 2.0 and 4.0). They were resized for the web. Each recipe page credits its photographer and links to the original; the full list is in [src/data/dishPhotos.js](src/data/dishPhotos.js).

## Ideas for later

- Pantry quantities ("2 onions"), so the shopping list can subtract what you have.
- Scale servings, converting measures as you go.
- Offline support with a service worker, so saved recipes open without a connection.
- Hands-free "next step" by voice in cook mode.
- More house recipes, or family recipes submitted through a small backend.
