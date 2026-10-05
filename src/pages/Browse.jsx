import { useEffect, useId, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { RecipeCard } from '../components/RecipeCard.jsx'
import { CardSkeletonGrid, EmptyState, ErrorState, RecipeGrid } from '../components/States.jsx'
import { Icon } from '../components/Icon.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import { browse, getCategories } from '../lib/recipes.js'
import { CUISINES, findCuisine } from '../lib/cuisines.js'
import { withParams } from '../lib/urlState.js'
import { cx } from '../lib/cx.js'

const PAGE_SIZE = 24
const FEATURED = CUISINES.filter((c) => c.featured)
const OTHERS = CUISINES.filter((c) => !c.featured)

/*
  Search, category and cuisine all live in the URL (?q=rice&c=Seafood&a=spanish),
  so any view can be shared or bookmarked, and Back/Forward step through
  your filters. The URL is the only state; the inputs just read it.
*/
export default function Browse() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const category = params.get('c') ?? ''
  const cuisineId = params.get('a') ?? ''
  const cuisine = findCuisine(cuisineId)
  const hasFilters = Boolean(q || category || cuisine)

  const setFilter = (changes) => setParams(withParams(params, changes))

  useDocumentTitle(
    hasFilters ? [q && `“${q}”`, category, cuisine?.label].filter(Boolean).join(' · ') : 'Browse recipes',
  )

  const categories = useAsync((signal) => getCategories({ signal }), [])
  const results = useAsync(
    hasFilters ? (signal) => browse({ q, category, cuisine: cuisine?.id }, { signal }) : null,
    [q, category, cuisine?.id],
  )

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold sm:text-4xl">Browse recipes</h1>

      <SearchBox key={q} initial={q} onSearch={(term) => setFilter({ q: term })} />

      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <CategoryPicker
          state={categories}
          value={category}
          onChange={(c) => setFilter({ c: c === category ? '' : c })}
        />
        <label className="flex shrink-0 flex-col gap-1 md:w-64">
          <span className="text-sm font-bold text-ink-soft">Cuisine</span>
          <select
            value={cuisine?.id ?? ''}
            onChange={(e) => setFilter({ a: e.target.value })}
            className="rounded-xl border-2 border-line-strong bg-panel px-3 py-2.5 font-bold focus:border-palm"
          >
            <option value="">All cuisines</option>
            <optgroup label="Featured">
              {FEATURED.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="From TheMealDB">
              {OTHERS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
      </div>

      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
          {q && <FilterChip label={`“${q}”`} onRemove={() => setFilter({ q: '' })} />}
          {category && <FilterChip label={category} onRemove={() => setFilter({ c: '' })} />}
          {cuisine && <FilterChip label={cuisine.label} onRemove={() => setFilter({ a: '' })} />}
          <button type="button" onClick={() => setParams({})} className="px-2 text-sm font-bold text-ink-soft underline-offset-4 hover:underline">
            Clear all
          </button>
        </div>
      )}

      {hasFilters ? (
        <Results state={results} q={q} category={category} cuisine={cuisine} setFilter={setFilter} />
      ) : (
        <StartHere categories={categories.data} />
      )}
    </div>
  )
}

// Search runs on submit (Enter or the button), not on every keystroke:
// each search is a request, and half-typed words make useless ones.
function SearchBox({ initial, onSearch }) {
  const [text, setText] = useState(initial)
  const id = useId()
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        onSearch(text.trim())
      }}
      className="flex gap-2"
    >
      <label htmlFor={id} className="sr-only">
        Search recipes by name
      </label>
      <input
        id={id}
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Search by name, e.g. jollof, curry, soup"
        enterKeyHint="search"
        className="min-w-0 flex-1 rounded-2xl border-2 border-line-strong bg-panel px-4 py-3 text-lg outline-none transition-shadow focus:border-palm focus:ring-4 focus:ring-palm/30"
      />
      <button type="submit" className="flex items-center gap-2 rounded-2xl bg-primary px-4 font-bold text-on-primary hover:bg-primary-hover sm:px-6">
        <Icon name="search" />
        <span className="max-sm:sr-only">Search</span>
      </button>
    </form>
  )
}

function CategoryPicker({ state, value, onChange }) {
  return (
    <fieldset className="min-w-0 flex-1">
      <legend className="mb-1 text-sm font-bold text-ink-soft">Category</legend>
      {state.status === 'error' ? (
        <p className="text-sm text-ink-soft">
          Categories didn't load.{' '}
          <button type="button" onClick={state.retry} className="font-bold underline">
            Retry
          </button>
        </p>
      ) : (
        // A single scrolling row on phones, wrapping on wider screens
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
          {(state.data ?? Array.from({ length: 8 }, () => null)).map((c, i) =>
            c ? (
              <button
                key={c}
                type="button"
                aria-pressed={value === c}
                onClick={() => onChange(c)}
                className={cx(
                  'min-h-11 shrink-0 rounded-full border-2 px-4 font-bold transition-colors',
                  value === c ? 'border-primary bg-primary text-on-primary' : 'border-line-strong hover:bg-panel-2',
                )}
              >
                {c}
              </button>
            ) : (
              <span key={i} className="h-11 w-20 shrink-0 animate-shimmer rounded-full bg-panel-2" />
            ),
          )}
        </div>
      )}
    </fieldset>
  )
}

function FilterChip({ label, onRemove }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Remove filter ${label}`}
      className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft py-1 pr-2 pl-3 text-sm font-bold hover:bg-panel-2"
    >
      {label}
      <Icon name="x" className="size-4" />
    </button>
  )
}

function Results({ state, q, category, cuisine, setFilter }) {
  const { status, data, error, retry } = state
  const [shown, setShown] = useState(PAGE_SIZE)
  const filterKey = [q, category, cuisine?.id].join('|')
  useEffect(() => setShown(PAGE_SIZE), [filterKey])

  if (status === 'error') return <ErrorState title="Couldn't load recipes" error={error} onRetry={retry} />
  if (!data) return <CardSkeletonGrid />

  const { results, failed } = data
  const describe = [category, cuisine && `${cuisine.label} cuisine`, q && `matching “${q}”`].filter(Boolean).join(', ')

  if (results.length === 0) {
    return (
      <EmptyState
        title="No recipes found"
        action={
          <div className="flex flex-wrap justify-center gap-2">
            {q && <Suggest onClick={() => setFilter({ q: '' })}>Drop “{q}”</Suggest>}
            {category && (q || cuisine) && <Suggest onClick={() => setFilter({ c: '' })}>Any category</Suggest>}
            {cuisine && (q || category) && <Suggest onClick={() => setFilter({ a: '' })}>Any cuisine</Suggest>}
            {!q && !(category && cuisine) && (
              <Link to="/browse?a=nigerian" className="rounded-full bg-primary px-5 py-2.5 font-bold text-on-primary hover:bg-primary-hover">
                See Nigerian house recipes
              </Link>
            )}
          </div>
        }
      >
        Nothing for {describe}. Search looks at recipe names, so try a shorter or different word, or loosen a
        filter.
      </EmptyState>
    )
  }

  return (
    <div className={cx('transition-opacity', status === 'loading' && 'opacity-60')}>
      <div className="mb-4 space-y-2" aria-live="polite">
        {failed.length > 0 && (
          <p className="flex gap-2 rounded-xl bg-plantain-soft px-4 py-3">
            <Icon name="alert" className="mt-0.5 size-5 shrink-0" />
            <span>
              Couldn't load recipes from {failed.join(', ')} just now.{' '}
              <button type="button" onClick={retry} className="font-bold underline">
                Retry
              </button>
            </span>
          </p>
        )}
        <p className="text-ink-soft">
          <strong className="text-ink">{results.length}</strong> recipe{results.length === 1 ? '' : 's'}
          {describe && <> · {describe}</>}
        </p>
      </div>
      <RecipeGrid>
        {results.slice(0, shown).map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </RecipeGrid>
      {shown < results.length && (
        <div className="mt-8 text-center">
          <button type="button" onClick={() => setShown((n) => n + PAGE_SIZE)} className="rounded-full border-2 border-line-strong px-6 py-2.5 font-bold hover:bg-panel-2">
            Show more ({results.length - shown} left)
          </button>
        </div>
      )}
    </div>
  )
}

function Suggest({ onClick, children }) {
  return (
    <button type="button" onClick={onClick} className="rounded-full border-2 border-line-strong px-4 py-2 font-bold hover:bg-panel-2">
      {children}
    </button>
  )
}

// With no filters: big doors into the two featured cuisines and the categories.
function StartHere({ categories }) {
  return (
    <div className="space-y-8">
      <section aria-labelledby="featured-heading">
        <h2 id="featured-heading" className="mb-3 text-xl font-bold">
          Start with
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Door to="/browse?a=nigerian" title="Nigerian" note="16 house recipes: jollof, egusi, suya and more" className="bg-[#b3261e]" />
          <Door to="/browse?a=african" title="African" note="Nigerian house recipes plus dishes from 7 more countries" className="bg-[#22306e]" />
        </div>
      </section>
      {categories && (
        <section aria-labelledby="cat-heading">
          <h2 id="cat-heading" className="mb-3 text-xl font-bold">
            Or pick a category
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {categories.map((c) => (
              <li key={c}>
                <Link
                  to={`/browse?c=${encodeURIComponent(c)}`}
                  className="block rounded-2xl bg-panel px-4 py-4 font-display text-lg font-bold shadow-ticket hover:bg-panel-2"
                >
                  {c}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function Door({ to, title, note, className }) {
  return (
    <Link to={to} className={cx('adire relative block overflow-hidden rounded-3xl p-6 text-[#fbf3e4] shadow-ticket hover:brightness-110', className)}>
      <span className="font-display text-3xl font-bold">{title}</span>
      <span className="mt-1 block max-w-xs text-[#fbf3e4]/90">{note}</span>
      <Icon name="right" className="absolute top-6 right-6 size-7" />
    </Link>
  )
}
