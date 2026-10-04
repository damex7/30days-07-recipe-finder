import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { SafeImage } from '../components/SafeImage.jsx'
import { SourceBadge } from '../components/SourceBadge.jsx'
import { FavouriteButton } from '../components/FavouriteButton.jsx'
import { EmptyState, ErrorState } from '../components/States.jsx'
import { Icon } from '../components/Icon.jsx'
import { usePantry } from '../context/PantryContext.jsx'
import { useShopping } from '../context/ShoppingContext.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import { checkIngredients, getRecipe } from '../lib/recipes.js'
import { findCuisineByLabel } from '../lib/cuisines.js'
import { cx } from '../lib/cx.js'

export default function Recipe() {
  const { id } = useParams()
  const { status, data: recipe, error, retry } = useAsync((signal) => getRecipe(id, { signal }), [id])
  useDocumentTitle(recipe?.name ?? null)

  if (status === 'error') {
    if (error.name === 'NotFoundError') {
      return (
        <EmptyState
          title="Recipe not found"
          action={
            <Link to="/browse" className="rounded-full bg-primary px-5 py-2.5 font-bold text-on-primary hover:bg-primary-hover">
              Browse recipes
            </Link>
          }
        >
          {error.message} It may have been removed, or the link was mistyped.
        </EmptyState>
      )
    }
    return <ErrorState title="Couldn't load this recipe" error={error} onRetry={retry} />
  }
  if (!recipe || recipe.id !== id) return <RecipeSkeleton />

  return <RecipeView recipe={recipe} />
}

function RecipeView({ recipe }) {
  const { pantry, setPantry } = usePantry()
  const { addItems, has: onList } = useShopping()
  const [added, setAdded] = useState(null)

  const checked = checkIngredients(recipe, pantry)
  const need = checked.filter((i) => !i.have)
  const haveCount = checked.filter((i) => i.have && !i.staple).length
  const countable = checked.filter((i) => !i.staple).length
  const cuisine = findCuisineByLabel(recipe.area)
  const isArt = recipe.origin === 'house'

  function addNeedsToList() {
    const n = addItems(need, recipe)
    setAdded(n)
  }

  return (
    <article className="space-y-8">
      {/* Header */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-end">
        <div className="relative overflow-hidden rounded-3xl shadow-ticket">
          <SafeImage
            src={recipe.image}
            thumb={recipe.thumb}
            eager
            sizes="(min-width: 1024px) 600px, 100vw"
            alt={isArt ? `Illustration of ${recipe.name} in a bowl` : `Photo of ${recipe.name}`}
            className="aspect-[4/3] w-full"
          />
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <SourceBadge recipe={recipe} />
            {recipe.area &&
              (cuisine ? (
                <Link to={`/browse?a=${cuisine.id}`} className="text-sm font-bold tracking-wide text-palm-ink uppercase hover:underline">
                  {recipe.area}
                </Link>
              ) : (
                <span className="text-sm font-bold tracking-wide text-palm-ink uppercase">{recipe.area}</span>
              ))}
            {recipe.category && (
              <>
                <span aria-hidden="true" className="text-ink-faint">·</span>
                <Link to={`/browse?c=${encodeURIComponent(recipe.category)}`} className="text-sm font-bold tracking-wide text-palm-ink uppercase hover:underline">
                  {recipe.category}
                </Link>
              </>
            )}
          </div>
          <h1 className="text-4xl leading-tight font-bold sm:text-5xl">{recipe.name}</h1>
          {recipe.tags.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Tags">
              {recipe.tags.map((tag) => (
                <li key={tag} className="rounded-full bg-panel-2 px-3 py-1 text-sm text-ink-soft">
                  {tag}
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap gap-3 pt-1">
            {recipe.steps.length > 0 && (
              <Link
                to={`/recipe/${recipe.id}/cook`}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-lg font-bold text-on-primary hover:bg-primary-hover"
              >
                <Icon name="flame" /> Start cooking
              </Link>
            )}
            <FavouriteButton recipe={recipe} withLabel />
            {recipe.youtube && (
              <a href="#video" className="inline-flex items-center gap-2 rounded-full border-2 border-line-strong px-4 py-2 font-bold hover:bg-panel-2">
                <Icon name="play" className="size-4" /> Video
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* Ingredients */}
        <section aria-labelledby="ingredients-heading" className="h-fit rounded-3xl bg-panel p-5 shadow-ticket sm:p-6 lg:sticky lg:top-4">
          <h2 id="ingredients-heading" className="text-2xl font-bold">
            Ingredients
          </h2>
          <p className="mt-1 text-ink-soft">
            {pantry.length === 0 ? (
              <>
                Add what's in your kitchen on the <Link to="/" className="font-bold text-palm-ink underline">Cook</Link> page to see what
                you already have.
              </>
            ) : (
              <>
                You have <strong className="text-leaf">{haveCount}</strong> of {countable}.{' '}
                {need.length ? `${need.length} to buy.` : 'Nothing to buy!'}
              </>
            )}
          </p>

          <ul className="mt-4 divide-y divide-line">
            {checked.map((ing, i) => (
              <li key={i} className="flex items-start gap-3 py-2.5">
                <Status ingredient={ing} />
                <div className="min-w-0 flex-1">
                  <span className="font-bold">{ing.name}</span>
                  {ing.measure && <span className="text-ink-soft"> · {ing.measure}</span>}
                </div>
                {!ing.have && (
                  <button
                    type="button"
                    onClick={() => setPantry([...pantry, ing.name.toLowerCase()])}
                    className="shrink-0 rounded-full px-2 py-1 text-xs font-bold text-ink-faint hover:bg-panel-2 hover:text-ink"
                  >
                    I have it
                  </button>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-faint">We assume you have salt and water.</p>

          {need.length > 0 && (
            <div className="mt-5 space-y-2">
              <button
                type="button"
                onClick={addNeedsToList}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-palm-ink px-5 py-3 font-bold text-white hover:brightness-110 dark:text-[#1b1206]"
              >
                <Icon name="basket" /> Add {need.length} to shopping list
              </button>
              <p aria-live="polite" className="text-center text-sm text-ink-soft">
                {added != null &&
                  (added > 0 ? (
                    <>
                      Added {added}. <Link to="/shopping" className="font-bold text-palm-ink underline">View list</Link>
                    </>
                  ) : (
                    <>
                      Already on your <Link to="/shopping" className="font-bold text-palm-ink underline">list</Link>.
                    </>
                  ))}
                {added == null && need.some((n) => onList(n.name)) && 'Some of these are already on your list.'}
              </p>
            </div>
          )}
        </section>

        {/* Method */}
        <div className="space-y-8">
          <section aria-labelledby="method-heading">
            <h2 id="method-heading" className="text-2xl font-bold">
              Method
            </h2>
            {recipe.steps.length === 0 ? (
              <p className="mt-3 text-ink-soft">This recipe doesn't include any steps.</p>
            ) : (
              <ol className="mt-4 space-y-5">
                {recipe.steps.map((step, i) => (
                  <li key={i} className="flex gap-4">
                    <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft font-display text-lg font-bold text-primary">
                      {i + 1}
                    </span>
                    <p className="pt-1 text-lg leading-relaxed">
                      <span className="sr-only">Step {i + 1}: </span>
                      {step}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {recipe.youtube && (
            <section id="video" aria-labelledby="video-heading" className="scroll-mt-4">
              <h2 id="video-heading" className="text-2xl font-bold">
                Watch it made
              </h2>
              <div className="mt-4 aspect-video overflow-hidden rounded-2xl bg-panel-2">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${recipe.youtube}`}
                  title={`Video: how to make ${recipe.name}`}
                  loading="lazy"
                  allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  className="size-full"
                />
              </div>
            </section>
          )}

          {recipe.source && (
            <p>
              <a href={recipe.source} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-palm-ink underline">
                Original recipe <Icon name="external" className="size-4" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </p>
          )}
        </div>
      </div>
    </article>
  )
}

function Status({ ingredient }) {
  const label = ingredient.staple ? 'Staple' : ingredient.have ? 'Have' : 'Need'
  return (
    <span
      className={cx(
        'mt-0.5 inline-flex w-16 shrink-0 items-center justify-center gap-1 rounded-full py-0.5 text-xs font-bold',
        ingredient.staple && 'bg-panel-2 text-ink-soft',
        !ingredient.staple && ingredient.have && 'bg-leaf-soft text-leaf',
        !ingredient.have && 'bg-pepper-soft text-pepper',
      )}
    >
      {ingredient.have && !ingredient.staple && <Icon name="check" className="size-3.5" />}
      {label}
    </span>
  )
}

function RecipeSkeleton() {
  return (
    <div role="status" aria-label="Loading recipe" className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-end">
        <div className="aspect-[4/3] w-full animate-shimmer rounded-3xl bg-panel-2" />
        <div className="space-y-4">
          <div className="h-4 w-1/3 animate-shimmer rounded bg-panel-2" />
          <div className="h-12 w-4/5 animate-shimmer rounded bg-panel-2" />
          <div className="h-10 w-1/2 animate-shimmer rounded-full bg-panel-2" />
        </div>
      </div>
      <div className="grid gap-8 lg:grid-cols-[2fr_3fr]">
        <div className="h-96 animate-shimmer rounded-3xl bg-panel-2" />
        <div className="space-y-4">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-16 animate-shimmer rounded-xl bg-panel-2" />
          ))}
        </div>
      </div>
    </div>
  )
}
