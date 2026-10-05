import { useId, useState } from 'react'
import { Icon } from './Icon.jsx'
import { cx } from '../lib/cx.js'
import { findTimes, formatClock, formatDuration, spokenDuration } from '../lib/timers.js'

/*
  Timer controls for cook mode, driven by useCookTimers:
  - StepTimers: a one-tap button for each time found in the step's text,
    plus "Custom timer" for steps that say "until golden" or for when your
    stove runs hot or slow.
  - TimerTray: every timer that's going, on every step, with pause, +1 min
    and stop. A finished timer rings until you stop it or add time.
*/
export function StepTimers({ step, text, cook }) {
  const found = findTimes(text)
  const [custom, setCustom] = useState(false)

  return (
    <div className="mt-8 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {found.map((time) => {
          const key = `${step}:${time.seconds}`
          const running = cook.timers.some((t) => t.key === key && !t.done)
          return (
            <button
              key={key}
              type="button"
              disabled={running}
              onClick={() => cook.start({ key, step, label: time.label, seconds: time.seconds, extra: time.extra })}
              aria-label={
                running
                  ? `${time.label} timer running`
                  : `Start a ${spokenDuration(time.seconds)} timer${time.note ? `. The recipe says ${time.note}` : ''}`
              }
              className="press inline-flex min-h-12 items-center gap-2 rounded-full bg-palm-soft px-4 text-lg font-bold text-palm-ink hover:brightness-95 disabled:opacity-60"
            >
              <Icon name="timer" />
              {running ? `${time.label} running` : `${time.label} timer`}
              {!running && time.note && <span className="text-base font-normal">({time.note})</span>}
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => setCustom((c) => !c)}
          aria-expanded={custom}
          className="inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-line-strong px-4 font-bold text-ink-soft hover:bg-panel-2"
        >
          <Icon name="plus" className="size-4" /> Custom timer
        </button>
      </div>
      {found.length > 0 && <p className="text-sm text-ink-faint">For a range we start with the shorter time, so you can check early.</p>}
      {custom && (
        <CustomTimer
          onStart={(minutes) => {
            cook.start({ key: `custom:${Date.now()}`, step, label: formatDuration(minutes * 60), seconds: minutes * 60 })
            setCustom(false)
          }}
          onCancel={() => setCustom(false)}
        />
      )}
    </div>
  )
}

const PRESETS = [1, 5, 10, 15, 30]

function CustomTimer({ onStart, onCancel }) {
  const [minutes, setMinutes] = useState('5')
  const id = useId()
  const value = Number(minutes)
  const valid = value > 0 && value <= 600

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) onStart(value)
      }}
      className="flex animate-fade-in flex-wrap items-end gap-3 rounded-2xl bg-panel p-4 shadow-ticket"
    >
      <div>
        <label htmlFor={id} className="block text-sm font-bold text-ink-soft">
          Minutes
        </label>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min="0.5"
          max="600"
          step="0.5"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          className="mt-1 w-24 rounded-xl border-2 border-line-strong bg-panel px-3 py-2 text-xl font-bold outline-none focus:border-palm focus:ring-4 focus:ring-palm/30"
        />
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick picks">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setMinutes(String(p))}
            aria-pressed={value === p}
            className={cx('min-h-11 min-w-11 rounded-full px-3 font-bold', value === p ? 'bg-primary text-on-primary' : 'bg-panel-2 hover:brightness-95')}
          >
            {p}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={!valid} className="min-h-11 rounded-full bg-primary px-5 font-bold text-on-primary hover:bg-primary-hover disabled:opacity-40">
          Start
        </button>
        <button type="button" onClick={onCancel} className="min-h-11 rounded-full px-4 font-bold text-ink-soft hover:bg-panel-2">
          Cancel
        </button>
      </div>
    </form>
  )
}

export function TimerTray({ cook, onGoToStep }) {
  if (cook.timers.length === 0) return null
  const finished = cook.timers.filter((t) => t.done)

  return (
    <section aria-label="Timers" className="border-t border-line bg-panel-2 px-3 py-2 sm:px-5">
      <ul className="flex gap-2 overflow-x-auto pb-0.5">
        {cook.timers.map((t) => (
          <TimerItem key={t.id} timer={t} left={cook.remaining(t)} cook={cook} onGoToStep={onGoToStep} />
        ))}
      </ul>
      {/* Announced the moment a timer finishes */}
      <p aria-live="assertive" className="sr-only">
        {finished.map((t) => `Time's up: step ${t.step}, ${t.label} timer.`).join(' ')}
      </p>
    </section>
  )
}

function TimerItem({ timer, left, cook, onGoToStep }) {
  const { id, done, endsAt, step, label, total, extra } = timer
  const paused = !done && !endsAt
  const progress = done ? 1 : 1 - left / total

  return (
    <li
      className={cx(
        'relative flex shrink-0 items-center gap-2 overflow-hidden rounded-2xl py-1.5 pr-1.5 pl-3',
        done ? 'animate-pulse bg-pepper text-white dark:text-[#1b1206]' : 'bg-panel shadow-ticket',
      )}
    >
      <button type="button" onClick={() => onGoToStep(step)} className="text-left" aria-label={`Go to step ${step}`}>
        <span className={cx('block text-xs font-bold', done ? 'opacity-90' : 'text-ink-faint')}>
          Step {step} · {label}
        </span>
        <span className="block font-display text-2xl leading-tight font-bold tabular-nums">
          {done ? "Time's up" : formatClock(left)}
          {paused && <span className="ml-1.5 align-middle text-xs font-bold text-ink-faint">paused</span>}
        </span>
      </button>

      {done ? (
        <>
          {extra > 0 && (
            <TrayButton onClick={() => cook.addTime(id, extra)} label={`Add ${formatDuration(extra)}, up to the longer time in the recipe`} inverted>
              +{formatDuration(extra)}
            </TrayButton>
          )}
          <TrayButton onClick={() => cook.addTime(id, 60)} label="Add 1 minute" inverted>
            +1
          </TrayButton>
          <button
            type="button"
            onClick={() => cook.remove(id)}
            className="min-h-11 rounded-xl bg-white px-4 font-bold text-pepper dark:bg-[#1b1206] dark:text-pepper"
          >
            Stop
          </button>
        </>
      ) : (
        <>
          <TrayButton onClick={() => (paused ? cook.resume(id) : cook.pause(id))} label={paused ? 'Resume timer' : 'Pause timer'}>
            <Icon name={paused ? 'play' : 'pause'} />
          </TrayButton>
          <TrayButton onClick={() => cook.addTime(id, 60)} label="Add 1 minute">
            +1
          </TrayButton>
          <TrayButton onClick={() => cook.remove(id)} label={`Cancel the step ${step} timer`}>
            <Icon name="x" />
          </TrayButton>
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-line">
            <span className="block h-full bg-palm transition-[width] duration-300" style={{ width: `${progress * 100}%` }} />
          </span>
        </>
      )}
    </li>
  )
}

function TrayButton({ onClick, label, inverted = false, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cx(
        'grid min-h-11 min-w-11 place-items-center rounded-xl px-2 font-bold',
        inverted ? 'hover:bg-white/15' : 'text-ink-soft hover:bg-panel-2 hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}
