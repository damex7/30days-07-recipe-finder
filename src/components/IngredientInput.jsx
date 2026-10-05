import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Icon } from './Icon.jsx'
import { cx } from '../lib/cx.js'
import { getIngredientIndex, LOCAL_SUGGESTIONS } from '../lib/recipes.js'
import { pantryKey } from '../lib/pantry.js'

const MAX_SUGGESTIONS = 8

/*
  Ingredient chips with suggestions, built on the ARIA combobox pattern:
  - The input has role="combobox" and points at the list with
    aria-controls; aria-activedescendant names the highlighted option,
    so focus stays in the input while ↑/↓ move through suggestions.
  - Enter or comma adds the highlighted suggestion (or what you typed),
    Backspace in an empty box removes the last chip, Escape closes.
  Suggestions are TheMealDB's ~1,000 ingredients plus our Nigerian extras.
*/
export function IngredientInput({ chips, onChange }) {
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [suggestions, setSuggestions] = useState(LOCAL_SUGGESTIONS)
  const inputRef = useRef(null)
  const listId = useId()
  const hintId = useId()

  useEffect(() => {
    let alive = true
    getIngredientIndex()
      .then((index) => alive && setSuggestions(index.suggestions))
      .catch(() => {}) // keep the local list; typing any ingredient still works
    return () => {
      alive = false
    }
  }, [])

  const chipKeys = useMemo(() => new Set(chips.map(pantryKey)), [chips])

  const matches = useMemo(() => {
    const q = text.trim().toLowerCase()
    if (!q) return []
    const starts = []
    const contains = []
    for (const s of suggestions) {
      if (chipKeys.has(s.key)) continue
      const name = s.name.toLowerCase()
      if (name.startsWith(q)) starts.push(s)
      else if (name.includes(q)) contains.push(s)
    }
    // Shorter names first within each group: "Rice" before "Rice Vermicelli"
    const byLength = (a, b) => a.name.length - b.name.length
    return [...starts.sort(byLength), ...contains.sort(byLength)].slice(0, MAX_SUGGESTIONS)
  }, [text, suggestions, chipKeys])

  const showList = open && matches.length > 0

  function add(name) {
    const clean = name.replace(/,/g, ' ').trim()
    if (!clean || chipKeys.has(pantryKey(clean))) {
      setText('')
      return
    }
    onChange([...chips, clean.toLowerCase()])
    setText('')
    setActive(0)
  }

  function remove(chip) {
    onChange(chips.filter((c) => c !== chip))
    inputRef.current?.focus()
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown' && matches.length) {
      e.preventDefault()
      setOpen(true)
      setActive((i) => (i + 1) % matches.length)
    } else if (e.key === 'ArrowUp' && matches.length) {
      e.preventDefault()
      setActive((i) => (i - 1 + matches.length) % matches.length)
    } else if (e.key === 'Enter' || e.key === ',') {
      if (!text.trim()) return
      e.preventDefault()
      add(showList ? matches[active].name : text)
    } else if (e.key === 'Escape') {
      setOpen(false)
    } else if (e.key === 'Backspace' && !text && chips.length) {
      onChange(chips.slice(0, -1))
    }
  }

  return (
    <div className="relative">
      <div
        className="flex flex-wrap items-center gap-2 rounded-2xl border-2 border-line-strong bg-panel p-2 transition-shadow focus-within:border-palm focus-within:ring-4 focus-within:ring-palm/30"
        onClick={() => inputRef.current?.focus()}
      >
        <ul className="contents" aria-label="Your ingredients">
          {chips.map((chip) => (
            <li key={chip}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  remove(chip)
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary py-1.5 pr-2 pl-3.5 font-bold text-on-primary hover:bg-primary-hover"
                aria-label={`Remove ${chip}`}
              >
                {chip}
                <Icon name="x" className="size-4" />
              </button>
            </li>
          ))}
        </ul>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList ? `${listId}-${active}` : undefined}
          aria-describedby={hintId}
          aria-label="Add an ingredient"
          placeholder={chips.length ? 'Add another…' : 'Type an ingredient, e.g. rice'}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setOpen(true)
            setActive(0)
          }}
          onKeyDown={onKeyDown}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          autoComplete="off"
          enterKeyHint="done"
          className="min-w-40 flex-1 bg-transparent px-2 py-1.5 text-lg outline-none placeholder:text-ink-faint"
        />
        {text.trim() && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => add(text)}
            className="grid size-10 place-items-center rounded-full bg-palm text-white hover:brightness-110"
            aria-label={`Add ${text.trim()}`}
          >
            <Icon name="plus" />
          </button>
        )}
      </div>
      <p id={hintId} className="sr-only">
        Press Enter to add. Use the arrow keys to pick a suggestion. Backspace removes the last ingredient.
      </p>

      <ul
        id={listId}
        role="listbox"
        aria-label="Suggestions"
        hidden={!showList}
        className="absolute inset-x-0 top-full z-20 mt-2 max-h-80 overflow-auto rounded-2xl border border-line bg-panel p-1.5 shadow-pop"
      >
        {matches.map((s, i) => (
          <li
            key={s.name}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            // mousedown, not click: it fires before the input's blur closes the list
            onMouseDown={(e) => {
              e.preventDefault()
              add(s.name)
            }}
            onMouseEnter={() => setActive(i)}
            className={cx(
              'flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5',
              i === active && 'bg-panel-2',
            )}
          >
            <span>{s.name}</span>
            {s.local && <span className="text-xs font-bold text-palm-ink">Nigerian pantry</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
