import { useEffect } from 'react'

const APP = 'Pepper Pot'

/** Sets the tab title ("Egusi Soup · Pepper Pot"), so history and tabs are readable. */
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP}` : `${APP} · Cook with what you have`
  }, [title])
}
