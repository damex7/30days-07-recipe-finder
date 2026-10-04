import { Icon } from './Icon.jsx'

/*
  The three states every data view needs besides "here's your data":
  loading (skeletons shaped like the real cards, so nothing jumps when
  they arrive), error (what went wrong + Retry) and empty (why it's empty
  + what to try next).
*/
export function CardSkeletonGrid({ count = 8 }) {
  return (
    <div role="status" aria-label="Loading recipes" className="grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl bg-panel shadow-ticket">
          <div className="aspect-[4/3] w-full animate-shimmer bg-panel-2" />
          <div className="ticket-tear" />
          <div className="space-y-3 p-4">
            <div className="h-3 w-1/3 animate-shimmer rounded bg-panel-2" />
            <div className="h-5 w-4/5 animate-shimmer rounded bg-panel-2" />
            <div className="h-3 w-1/2 animate-shimmer rounded bg-panel-2" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ErrorState({ title = 'Something went wrong', error, onRetry }) {
  return (
    <div role="alert" className="mx-auto max-w-md rounded-2xl border-2 border-dashed border-pepper/40 bg-pepper-soft p-6 text-center">
      <Icon name="alert" className="mx-auto size-8 text-pepper" />
      <h2 className="mt-2 text-xl font-bold">{title}</h2>
      <p className="mt-1 text-ink-soft">{error?.message ?? 'Please try again.'}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-bold text-on-primary hover:bg-primary-hover"
        >
          <Icon name="retry" className="size-4" /> Retry
        </button>
      )}
    </div>
  )
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border-2 border-dashed border-line p-6 text-center">
      <Icon name="pot" className="mx-auto size-9 text-palm" />
      <h2 className="mt-2 text-xl font-bold">{title}</h2>
      {children && <div className="mt-1 text-ink-soft">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function RecipeGrid({ children }) {
  return <div className="grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{children}</div>
}
