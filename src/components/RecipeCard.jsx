import { Link } from 'react-router-dom'
import { SafeImage } from './SafeImage.jsx'
import { SourceBadge } from './SourceBadge.jsx'
import { FavouriteButton } from './FavouriteButton.jsx'

/*
  A recipe as a market ticket: photo on top, a perforated tear line, and
  the stub with the name and how well it fits your pantry.
  The whole card is clickable through the title link's ::after overlay,
  which keeps a single link per card for screen readers and keyboards.
*/
export function RecipeCard({ recipe, matched, total, toBuy }) {
  const meta = [recipe.area, recipe.category].filter(Boolean).join(' · ')
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl bg-panel shadow-ticket transition-transform focus-within:-translate-y-0.5 hover:-translate-y-0.5">
      <div className="relative">
        <SafeImage src={recipe.image} thumb={recipe.thumb} alt="" className="aspect-[4/3] w-full" />
        <SourceBadge recipe={recipe} className="absolute top-3 left-3 shadow" />
        <FavouriteButton recipe={recipe} className="absolute top-2 right-2 z-10" />
      </div>

      <div className="ticket-tear" />

      <div className="flex flex-1 flex-col gap-2 p-4 pt-3">
        {meta && <p className="text-xs font-bold tracking-wide text-palm-ink uppercase">{meta}</p>}
        <h3 className="text-lg leading-snug font-bold">
          <Link to={`/recipe/${recipe.id}`} className="rounded after:absolute after:inset-0 after:content-['']">
            {recipe.name}
          </Link>
        </h3>

        {matched && (
          <div className="mt-auto space-y-1.5 pt-1">
            <p className="text-sm font-bold text-leaf">
              Uses {matched.length} of your {total} ingredient{total === 1 ? '' : 's'}
            </p>
            <MatchDots used={matched.length} total={total} />
            <p className="text-sm text-ink-soft">
              {matched.join(', ')}
              {toBuy != null && (
                <span className="text-ink-faint">
                  {' '}
                  · {toBuy === 0 ? 'nothing to buy' : `${toBuy} more to buy`}
                </span>
              )}
            </p>
          </div>
        )}
      </div>
    </article>
  )
}

function MatchDots({ used, total }) {
  return (
    <div className="flex gap-1" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i < used ? 'h-1.5 flex-1 rounded-full bg-leaf' : 'h-1.5 flex-1 rounded-full bg-line'} />
      ))}
    </div>
  )
}
