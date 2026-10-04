import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icon.jsx'
import { surpriseRecipeId } from '../lib/recipes.js'

/*
  /surprise picks a random recipe and redirects to it. `replace` swaps
  /surprise out of the history, so Back returns to where you were rather
  than rolling the dice again.
*/
export default function Surprise() {
  const navigate = useNavigate()

  useEffect(() => {
    const controller = new AbortController()
    surpriseRecipeId({ signal: controller.signal }).then(
      (id) => navigate(`/recipe/${id}`, { replace: true }),
      () => {}, // only an abort can land here: surpriseRecipeId falls back to a house recipe
    )
    return () => controller.abort()
  }, [navigate])

  return (
    <div role="status" className="flex flex-col items-center gap-3 py-24 text-center">
      <Icon name="dice" className="size-12 animate-shimmer text-palm" />
      <p className="font-display text-2xl font-bold">Picking something for you…</p>
    </div>
  )
}
