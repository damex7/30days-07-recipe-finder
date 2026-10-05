import { useFavourites } from '../context/FavouritesContext.jsx'
import { Icon } from './Icon.jsx'
import { cx } from '../lib/cx.js'

/** A heart toggle. aria-pressed tells screen readers whether it's on. */
export function FavouriteButton({ recipe, className, withLabel = false }) {
  const { isFavourite, toggleFavourite } = useFavourites()
  const saved = isFavourite(recipe.id)
  return (
    <button
      type="button"
      onClick={() => toggleFavourite(recipe)}
      aria-pressed={saved}
      aria-label={withLabel ? undefined : `Save ${recipe.name}`}
      className={cx(
        'rounded-full font-bold transition-colors',
        withLabel
          ? 'inline-flex items-center gap-2 border-2 border-line-strong px-4 py-2 hover:bg-panel-2'
          : 'grid size-11 place-items-center bg-panel/90 shadow backdrop-blur hover:bg-panel',
        saved && 'text-pepper',
        className,
      )}
    >
      <Icon name="heart" className={cx('size-5', saved && '[&_path]:fill-current')} />
      {withLabel && (saved ? 'Saved' : 'Save')}
    </button>
  )
}
