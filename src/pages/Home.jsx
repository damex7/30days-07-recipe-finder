import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { IngredientInput } from '../components/IngredientInput.jsx'
import { RecipeCard } from '../components/RecipeCard.jsx'
import { CardSkeletonGrid, EmptyState, ErrorState, RecipeGrid } from '../components/States.jsx'
import { Icon } from '../components/Icon.jsx'
import { usePantry } from '../context/PantryContext.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import { cookWith, LOCAL_RECIPES } from '../lib/recipes.js'
import { parseList } from '../lib/urlState.js'

const PAGE_SIZE = 24

const EXAMPLES = [
  ['rice', 'tomato', 'scotch bonnet', 'chicken'],
  ['beans', 'plantain', 'palm oil'],
  ['egusi', 'spinach', 'beef'],
  ['yam', 'eggs'],
]

export default function Home() {
  const [params, setParams] = useSearchParams()
  const { pantry, setPantry } = usePantry()
  const raw = params.get('i')
  const chips = parseList(raw)
  const chipsKey = chips.join('|')

  useDocumentTitle(chips.length ? `Cook with ${chips.join(', ')}` : null)

  /*
    The URL is the source of truth for this page (so links can be shared);
    the pantry remembers it between visits.
    - Shared link (?i=...): adopt it as your pantry.
    - Plain "/": put your saved pantry back into the URL.
  */
  useEffect(() => {
    if (raw === null) {
      if (pantry.length) setParams({ i: pantry.join(',') }, { replace: true })
    } else if (chipsKey !== pantry.join('|')) {
      setPantry(chips)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw])

  function setChips(next) {
    setPantry(next)
    // replace: adding five ingredients shouldn't take five presses of Back to leave the page
    setParams(next.length ? { i: next.join(',') } : {}, { replace: true })
  }

  const { status, data, error, retry } = useAsync(chips.length ? (signal) => cookWith(chips, { signal }) : null, [chipsKey])

  return (
    <div className="space-y-8">
      <section aria-labelledby="pantry-heading" className="space-y-4">
        <div>
          <h1 id="pantry-heading" className="text-3xl leading-tight font-bold sm:text-5xl">
            What's in your <span className="text-palm-ink italic">kitchen?</span>
          </h1>
          <p className="mt-2 max-w-xl text-lg text-ink-soft">
            Add what you have. We'll find recipes that use it, Nigerian house recipes included, and show what you'd
            still need to buy.
          </p>
        </div>

        <IngredientInput chips={chips} onChange={setChips} />

        <div className="flex flex-wrap items-center gap-2 text-sm">
          {chips.length ? (
            <button type="button" onClick={() => setChips([])} className="min-h-11 rounded-full px-3 font-bold text-ink-soft underline-offset-4 hover:underline">
              Clear all
            </button>
          ) : (
            <>
              <span className="font-bold text-ink-faint">Try:</span>
              {EXAMPLES.map((set) => (
                <button
                  key={set.join()}
                  type="button"
                  onClick={() => setChips(set)}
                  className="min-h-11 rounded-full border-2 border-dashed border-line-strong px-3.5 font-bold text-ink-soft hover:border-palm hover:text-ink"
                >
                  {set.join(' + ')}
                </button>
              ))}
            </>
          )}
        </div>
      </section>

      {chips.length === 0 ? (
        <HouseKitchen />
      ) : (
        <section aria-labelledby="results-heading" aria-busy={status === 'loading'}>
          <h2 id="results-heading" className="sr-only">
            Recipes
          </h2>
          <Results chips={chips} status={status} data={data} error={error} retry={retry} onRemove={(c) => setChips(chips.filter((x) => x !== c))} />
        </section>
      )}
    </div>
  )
}

function Results({ chips, status, data, error, retry, onRemove }) {
  const [shown, setShown] = useState(PAGE_SIZE)
  const chipsKey = chips.join('|')
  useEffect(() => setShown(PAGE_SIZE), [chipsKey])

  if (status === 'error') return <ErrorState title="Couldn't search for recipes" error={error} onRetry={retry} />
  if (!data) return <CardSkeletonGrid />

  const { results, failed, houseOnly } = data
  const updating = status === 'loading'

  return (
    <div className={updating ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
      <div className="mb-4 space-y-2" aria-live="polite">
        {failed.length > 0 && (
          <Notice tone="warn">
            Couldn't check <strong>{failed.join(', ')}</strong> just now, so some recipes may be missing.{' '}
            <button type="button" onClick={retry} className="font-bold underline underline-offset-2">
              Retry
            </button>
          </Notice>
        )}
        {houseOnly.length > 0 && (
          <Notice>
            TheMealDB doesn't know <strong>{houseOnly.join(', ')}</strong>, so for {houseOnly.length === 1 ? 'it' : 'them'} we
            searched our house recipes only.
          </Notice>
        )}
        {results.length > 0 && (
          <p className="text-ink-soft">
            <strong className="text-ink">{results.length}</strong> recipe{results.length === 1 ? '' : 's'}, best match first.
          </p>
        )}
      </div>

      {results.length === 0 ? (
        <EmptyState
          title="Nothing uses those yet"
          action={
            chips.length > 1 ? (
              <button type="button" onClick={() => onRemove(chips.at(-1))} className="rounded-full bg-primary px-5 py-2.5 font-bold text-on-primary hover:bg-primary-hover">
                Try without “{chips.at(-1)}”
              </button>
            ) : (
              <Link to="/browse" className="rounded-full bg-primary px-5 py-2.5 font-bold text-on-primary hover:bg-primary-hover">
                Browse all recipes
              </Link>
            )
          }
        >
          Try a more general name (“chicken” rather than “chicken thighs”), or pick a suggestion from the list as you type.
        </EmptyState>
      ) : (
        <>
          <RecipeGrid>
            {results.slice(0, shown).map((r) => (
              <RecipeCard key={r.recipe.id} recipe={r.recipe} matched={r.matched} total={chips.length} toBuy={r.toBuy} />
            ))}
          </RecipeGrid>
          {shown < results.length && (
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => setShown((n) => n + PAGE_SIZE)}
                className="rounded-full border-2 border-line-strong px-6 py-2.5 font-bold hover:bg-panel-2"
              >
                Show more ({results.length - shown} left)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Notice({ tone, children }) {
  return (
    <p className={tone === 'warn' ? 'flex gap-2 rounded-xl bg-plantain-soft px-4 py-3' : 'flex gap-2 rounded-xl bg-primary-soft px-4 py-3'}>
      <Icon name={tone === 'warn' ? 'alert' : 'pot'} className="mt-0.5 size-5 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

function HouseKitchen() {
  return (
    <section aria-labelledby="house-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="house-heading" className="text-2xl font-bold">
            From the house kitchen
          </h2>
          <p className="text-ink-soft">Nigerian classics TheMealDB doesn't have, written for this app.</p>
        </div>
        <Link to="/browse?a=nigerian" className="inline-flex items-center gap-1 font-bold text-palm-ink hover:underline">
          All {LOCAL_RECIPES.length} house recipes <Icon name="right" className="size-4" />
        </Link>
      </div>
      <RecipeGrid>
        {LOCAL_RECIPES.slice(0, 8).map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </RecipeGrid>
    </section>
  )
}
