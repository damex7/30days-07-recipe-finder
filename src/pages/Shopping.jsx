import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/States.jsx'
import { Icon } from '../components/Icon.jsx'
import { listAsText, useShopping } from '../context/ShoppingContext.jsx'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import { cx } from '../lib/cx.js'

export default function Shopping() {
  const { items, remaining, toggle, remove, clearDone, clearAll } = useShopping()
  const [message, setMessage] = useState('')
  useDocumentTitle('Shopping list')

  // Still-to-buy first; ticked items sink to the bottom
  const sorted = [...items].sort((a, b) => Number(a.done) - Number(b.done))
  const doneCount = items.length - remaining

  /*
    Share: the Web Share API (navigator.share) opens the phone's own share
    sheet (WhatsApp, Messages...). Desktop browsers mostly lack it, so we
    fall back to copying the text.
  */
  async function share() {
    const text = listAsText(items)
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Shopping list', text })
        return
      } catch (err) {
        if (err.name === 'AbortError') return // you closed the share sheet
      }
    }
    copy()
  }

  async function copy() {
    const text = listAsText(items)
    try {
      await navigator.clipboard.writeText(text)
      setMessage('Copied. Paste it anywhere.')
    } catch {
      // Clipboard API blocked (e.g. plain http on a phone): the old textarea trick
      const area = document.createElement('textarea')
      area.value = text
      area.setAttribute('readonly', '')
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.append(area)
      area.select()
      const ok = document.execCommand('copy')
      area.remove()
      setMessage(ok ? 'Copied. Paste it anywhere.' : "Couldn't copy. Your browser blocked it.")
    }
  }

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold sm:text-4xl">Shopping list</h1>
        <EmptyState
          title="Your list is empty"
          action={
            <Link to="/" className="rounded-full bg-primary px-5 py-2.5 font-bold text-on-primary hover:bg-primary-hover">
              Find something to cook
            </Link>
          }
        >
          Open any recipe and tap “Add to shopping list” to collect what you need. The same ingredient from different
          recipes is merged into one line.
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">Shopping list</h1>
          <p className="mt-1 text-ink-soft">
            {remaining ? `${remaining} to buy` : 'All done!'}
            {doneCount > 0 && ` · ${doneCount} ticked off`}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={share} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 font-bold text-on-primary hover:bg-primary-hover">
            <Icon name="share" className="size-4" /> Share
          </button>
          <button type="button" onClick={copy} className="inline-flex items-center gap-2 rounded-full border-2 border-line-strong px-4 py-2 font-bold hover:bg-panel-2">
            <Icon name="copy" className="size-4" /> Copy
          </button>
        </div>
      </div>
      <p aria-live="polite" className="min-h-6 text-sm font-bold text-leaf">
        {message}
      </p>

      {/* A ticket-style list */}
      <ul className="overflow-hidden rounded-3xl bg-panel shadow-ticket">
        {sorted.map((item, i) => (
          <li key={item.key} className={cx('flex items-start gap-3 px-4 py-3 sm:px-5', i > 0 && 'border-t-2 border-dashed border-line')}>
            <input
              id={`item-${item.key.replace(/ /g, '-')}`}
              type="checkbox"
              checked={item.done}
              onChange={() => toggle(item.key)}
              className="mt-1 size-6 shrink-0 accent-[var(--color-leaf)]"
            />
            <label htmlFor={`item-${item.key.replace(/ /g, '-')}`} className="min-w-0 flex-1 cursor-pointer">
              <span className={cx('text-lg font-bold', item.done && 'text-ink-faint line-through')}>{item.name}</span>
              <span className="block text-sm text-ink-soft">
                {item.uses.map((u, k) => (
                  <span key={u.recipeId}>
                    {k > 0 && ' + '}
                    {u.measure || 'some'} <span className="text-ink-faint">for {u.recipeName}</span>
                  </span>
                ))}
              </span>
            </label>
            <button
              type="button"
              onClick={() => remove(item.key)}
              aria-label={`Remove ${item.name}`}
              className="grid size-9 shrink-0 place-items-center rounded-full text-ink-faint hover:bg-panel-2 hover:text-pepper"
            >
              <Icon name="trash" className="size-4.5" />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-3">
        {doneCount > 0 && (
          <button type="button" onClick={clearDone} className="rounded-full border-2 border-line-strong px-4 py-2 font-bold hover:bg-panel-2">
            Remove ticked ({doneCount})
          </button>
        )}
        <button
          type="button"
          onClick={() => window.confirm('Clear the whole shopping list?') && clearAll()}
          className="rounded-full px-4 py-2 font-bold text-pepper hover:bg-pepper-soft"
        >
          Clear list
        </button>
      </div>
    </div>
  )
}
