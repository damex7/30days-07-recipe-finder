import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ErrorState } from '../components/States.jsx'
import { Icon } from '../components/Icon.jsx'
import { usePantry } from '../context/PantryContext.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import { useWakeLock } from '../hooks/useWakeLock.js'
import { checkIngredients, getRecipe } from '../lib/recipes.js'
import { cx } from '../lib/cx.js'

/*
  Cook mode: one step at a time, in big text, for a phone propped up on the
  counter. It sits outside the normal layout (no header or tab bar) and
  covers the whole screen.

  - The current step is in the URL (?step=3), so a refresh or an
    accidental swipe-back-and-forward keeps your place.
  - ← / → (and the big buttons) move between steps; Esc leaves.
  - useWakeLock keeps the screen from dimming while you cook.
*/
export default function CookMode() {
  const { id } = useParams()
  const { status, data: recipe, error, retry } = useAsync((signal) => getRecipe(id, { signal }), [id])
  useDocumentTitle(recipe ? `Cooking ${recipe.name}` : null)

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-cream">
      {status === 'error' ? (
        <div className="m-auto p-4">
          <ErrorState title="Couldn't open cook mode" error={error} onRetry={retry} />
          <p className="mt-4 text-center">
            <Link to={`/recipe/${id}`} className="font-bold underline">
              Back to the recipe
            </Link>
          </p>
        </div>
      ) : !recipe || recipe.id !== id ? (
        <div role="status" className="m-auto flex flex-col items-center gap-3 text-ink-soft">
          <Icon name="pot" className="size-10 animate-shimmer text-palm" />
          Getting the recipe ready…
        </div>
      ) : (
        <Steps recipe={recipe} />
      )}
    </div>
  )
}

function Steps({ recipe }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { pantry } = usePantry()
  const wake = useWakeLock()
  const [showIngredients, setShowIngredients] = useState(false)
  const [big, setBig] = useState(true)
  const total = recipe.steps.length
  const done = params.get('step') === 'done'
  const step = Math.min(Math.max(parseInt(params.get('step') ?? '1', 10) || 1, 1), total)
  const stepRef = useRef(null)

  const go = (next) => setParams(next === 'done' ? { step: 'done' } : { step: String(next) }, { replace: true })
  const exit = () => navigate(`/recipe/${recipe.id}`)

  useEffect(() => {
    function onKey(e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (done) return
        go(step < total ? step + 1 : 'done')
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        go(done ? total : Math.max(1, step - 1))
      } else if (e.key === 'Escape') {
        if (showIngredients) setShowIngredients(false)
        else exit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Each new step starts at the top (long steps can scroll on small phones)
  useEffect(() => {
    stepRef.current?.scrollTo?.({ top: 0 })
  }, [step, done])

  if (total === 0) {
    return (
      <div className="m-auto max-w-sm p-6 text-center">
        <p className="text-xl">This recipe has no steps to cook through.</p>
        <Link to={`/recipe/${recipe.id}`} className="mt-4 inline-block font-bold underline">
          Back to the recipe
        </Link>
      </div>
    )
  }

  const checked = checkIngredients(recipe, pantry)

  return (
    <>
      {/* Top bar */}
      <header className="adire flex items-center gap-2 px-3 py-2 text-[#fbf3e4] sm:px-5">
        <button type="button" onClick={exit} className="grid size-11 place-items-center rounded-full hover:bg-white/10" aria-label="Leave cook mode">
          <Icon name="x" className="size-6" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-bold">{recipe.name}</p>
          <WakeStatus status={wake} />
        </div>
        <FullscreenButton />
        <button
          type="button"
          onClick={() => setBig((b) => !b)}
          aria-pressed={big}
          className="rounded-full px-3 py-2 font-display font-bold hover:bg-white/10"
          aria-label="Extra large text"
        >
          <span aria-hidden="true" className="text-sm">A</span>
          <span aria-hidden="true" className="text-xl">A</span>
        </button>
        <button
          type="button"
          onClick={() => setShowIngredients((s) => !s)}
          aria-expanded={showIngredients}
          aria-controls="cook-ingredients"
          className={cx('flex items-center gap-2 rounded-full px-3 py-2 font-bold', showIngredients ? 'bg-[#fbf3e4] text-[#22306e]' : 'hover:bg-white/10')}
        >
          <Icon name="list" />
          <span className="max-sm:sr-only">Ingredients</span>
        </button>
      </header>

      {/* Progress */}
      <div className="flex gap-1 px-3 pt-3 sm:px-5" aria-hidden="true">
        {recipe.steps.map((_, i) => (
          <span key={i} className={cx('h-1.5 flex-1 rounded-full', done || i < step ? 'bg-palm' : 'bg-line')} />
        ))}
      </div>

      <div className="relative flex min-h-0 flex-1">
        <main ref={stepRef} className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-y-auto px-5 py-6 sm:px-8 sm:py-10">
          {/* aria-live: screen readers read each new step out as you move */}
          <div aria-live="polite" aria-atomic="true" className="my-auto">
            {done ? (
              <div className="text-center">
                <Icon name="pot" className="mx-auto size-16 text-palm" />
                <h1 className="mt-4 text-4xl font-bold sm:text-5xl">Enjoy your meal!</h1>
                <p className="mt-3 text-xl text-ink-soft">You've finished all {total} steps of {recipe.name}.</p>
              </div>
            ) : (
              <>
                <p className="font-display text-lg font-bold text-palm-ink">
                  Step {step} <span className="text-ink-faint">of {total}</span>
                </p>
                <p className={cx('mt-3 leading-snug font-bold', big ? 'text-[clamp(1.6rem,5.5vw,2.75rem)]' : 'text-[clamp(1.25rem,4vw,1.9rem)]')}>
                  {recipe.steps[step - 1]}
                </p>
              </>
            )}
          </div>
        </main>

        {showIngredients && (
          <aside
            id="cook-ingredients"
            aria-label="Ingredients"
            className="absolute inset-y-0 right-0 w-full max-w-sm overflow-y-auto border-l border-line bg-panel p-5 shadow-pop"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Ingredients</h2>
              <button type="button" onClick={() => setShowIngredients(false)} className="grid size-10 place-items-center rounded-full hover:bg-panel-2" aria-label="Close ingredients">
                <Icon name="x" />
              </button>
            </div>
            <ul className="mt-3 divide-y divide-line text-lg">
              {checked.map((ing, i) => (
                <li key={i} className="py-2.5">
                  <span className="font-bold">{ing.name}</span>
                  {ing.measure && <span className="text-ink-soft"> · {ing.measure}</span>}
                  {!ing.have && <span className="ml-2 rounded-full bg-pepper-soft px-2 py-0.5 text-xs font-bold text-pepper">Need</span>}
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>

      {/* Big controls, within thumb reach */}
      <nav aria-label="Steps" className="grid grid-cols-2 gap-3 border-t border-line bg-panel p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
        <button
          type="button"
          onClick={() => go(done ? total : step - 1)}
          disabled={!done && step === 1}
          className="flex items-center justify-center gap-2 rounded-2xl border-2 border-line-strong py-4 text-xl font-bold hover:bg-panel-2 disabled:opacity-40"
        >
          <Icon name="left" className="size-6" /> Back
        </button>
        {done ? (
          <Link to={`/recipe/${recipe.id}`} className="press flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-xl font-bold text-on-primary hover:bg-primary-hover">
            Done <Icon name="check" className="size-6" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => go(step < total ? step + 1 : 'done')}
            className="flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-xl font-bold text-on-primary hover:bg-primary-hover"
          >
            {step < total ? 'Next' : 'Finish'} <Icon name="right" className="size-6" />
          </button>
        )}
      </nav>
      <p className="sr-only">Use the left and right arrow keys to move between steps, and Escape to leave.</p>
    </>
  )
}

function WakeStatus({ status }) {
  const text = {
    pending: 'Keeping screen on…',
    active: 'Screen will stay on',
    released: 'Screen may dim',
    unsupported: 'Screen may dim (not supported here)',
    error: 'Screen may dim (request refused)',
  }[status]
  return (
    <p className="flex items-center gap-1.5 text-xs text-[#fbf3e4]/85">
      <span aria-hidden="true" className={cx('size-2 rounded-full', status === 'active' ? 'bg-[#7fd08e]' : 'bg-[#f2c14e]')} />
      {text}
    </p>
  )
}

// Hides the browser's own toolbars where the Fullscreen API exists (not on iPhone Safari).
function FullscreenButton() {
  const [on, setOn] = useState(() => Boolean(document.fullscreenElement))
  useEffect(() => {
    const sync = () => setOn(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', sync)
    return () => {
      document.removeEventListener('fullscreenchange', sync)
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {}) // leaving cook mode ends full screen
    }
  }, [])
  if (!document.fullscreenEnabled) return null
  const toggle = () => (on ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {})
  return (
    <button type="button" onClick={toggle} aria-pressed={on} aria-label="Full screen" className="grid size-11 place-items-center rounded-full hover:bg-white/10">
      <Icon name="expand" />
    </button>
  )
}
