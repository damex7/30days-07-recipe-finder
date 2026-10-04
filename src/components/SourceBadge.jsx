import { cx } from '../lib/cx.js'

/** Marks recipes from our own collection. API recipes get no badge. */
export function SourceBadge({ recipe, className }) {
  if (recipe.origin !== 'house') return null
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full bg-[#f2c14e] px-2.5 py-0.5 text-xs font-bold text-[#1b1d3a]',
        className,
      )}
    >
      <span aria-hidden="true">★</span> House recipe
    </span>
  )
}
