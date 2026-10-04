import { useState } from 'react'
import { Icon } from './Icon.jsx'
import { cx } from '../lib/cx.js'

/*
  A recipe photo that:
  - lazy-loads (the browser only downloads it when it nears the screen),
  - offers the small and full versions via srcset, so a phone grid can
    take the ~13 KB thumbnail instead of the ~200 KB original,
  - swaps to a designed placeholder if the image fails, instead of the
    browser's broken-image icon.
*/
export function SafeImage({ src, thumb, alt, sizes = '(min-width: 1024px) 280px, (min-width: 640px) 45vw, 100vw', className, eager = false }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : 'true'}
        className={cx('adire grid place-items-center text-[#fbf3e4]', className)}>
        <div className="flex flex-col items-center gap-1 rounded-2xl bg-[#22306e]/80 px-4 py-3 text-center">
          <Icon name="pot" className="size-8" />
          <span className="text-xs font-bold tracking-wide uppercase">No photo</span>
        </div>
      </div>
    )
  }

  const useSrcSet = thumb && thumb !== src && !src.startsWith('data:')
  return (
    <img
      src={src}
      srcSet={useSrcSet ? `${thumb} 250w, ${src} 700w` : undefined}
      sizes={useSrcSet ? sizes : undefined}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
      className={cx('bg-panel-2 object-cover', className)}
    />
  )
}
