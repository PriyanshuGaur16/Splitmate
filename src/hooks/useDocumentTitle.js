import { useEffect } from 'react'

export const APP_NAME = 'Splitmate'

// Sets the browser tab title to "<title> | Splitmate". Pass a full title with
// { full: true } for pages that don't use the suffix (the landing page).
export default function useDocumentTitle(title, { full = false } = {}) {
  useEffect(() => {
    document.title = full ? title : `${title} | ${APP_NAME}`
  }, [title, full])
}
