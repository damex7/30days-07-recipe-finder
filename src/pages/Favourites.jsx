import { Link } from 'react-router-dom'
import { RecipeCard } from '../components/RecipeCard.jsx'
import { EmptyState, RecipeGrid } from '../components/States.jsx'
import { useFavourites } from '../context/FavouritesContext.jsx'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'

export default function Favourites() {
  const { favourites } = useFavourites()
  useDocumentTitle('Saved recipes')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold sm:text-4xl">Saved recipes</h1>
        <p className="mt-1 text-ink-soft">
          {favourites.length
            ? `${favourites.length} recipe${favourites.length === 1 ? '' : 's'}, newest first. Saved on this device.`
            : 'Recipes you save are kept on this device.'}
        </p>
      </div>

      {favourites.length === 0 ? (
        <EmptyState
          title="Nothing saved yet"
          action={
            <Link to="/browse?a=nigerian" className="rounded-full bg-primary px-5 py-2.5 font-bold text-on-primary hover:bg-primary-hover">
              Start with the house recipes
            </Link>
          }
        >
          Tap the heart on any recipe to keep it here for later.
        </EmptyState>
      ) : (
        <RecipeGrid>
          {favourites.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </RecipeGrid>
      )}
    </div>
  )
}
