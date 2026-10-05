import { createContext, useCallback, useContext, useMemo } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import { findLocalRecipe } from '../data/localRecipes.js'

/*
  Favourites, saved in localStorage. We store a small summary of each
  recipe (still in the clean shape, with complete: false) so the
  Favourites page can show cards instantly, even offline, without
  re-fetching every recipe. The recipe page fetches the full version.
*/
const FavouritesContext = createContext(null)

const summarise = (r) => ({
  id: r.id,
  name: r.name,
  category: r.category,
  area: r.area,
  image: r.image,
  thumb: r.thumb,
  tags: r.tags ?? [],
  ingredients: [],
  steps: [],
  youtube: null,
  source: null,
  origin: r.origin,
  complete: false,
})

// House recipes ship with the app, so show their current picture rather
// than whichever one was saved (older saves hold the illustrated tile).
const withCurrentImage = (f) => {
  const house = f.origin === 'house' && findLocalRecipe(f.id)
  return house ? { ...f, image: house.image, thumb: house.thumb } : f
}

export function FavouritesProvider({ children }) {
  const [stored, setFavourites] = useLocalStorage('pepperpot-favourites', [])
  const favourites = useMemo(() => stored.map(withCurrentImage), [stored])

  const isFavourite = useCallback((id) => favourites.some((f) => f.id === id), [favourites])

  const toggleFavourite = useCallback(
    (recipe) =>
      setFavourites(
        favourites.some((f) => f.id === recipe.id)
          ? favourites.filter((f) => f.id !== recipe.id)
          : [summarise(recipe), ...favourites],
      ),
    [favourites, setFavourites],
  )

  const value = useMemo(() => ({ favourites, isFavourite, toggleFavourite }), [favourites, isFavourite, toggleFavourite])
  return <FavouritesContext.Provider value={value}>{children}</FavouritesContext.Provider>
}

export function useFavourites() {
  const ctx = useContext(FavouritesContext)
  if (!ctx) throw new Error('useFavourites must be used inside <FavouritesProvider>')
  return ctx
}
