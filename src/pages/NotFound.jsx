import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="font-display text-6xl font-bold text-palm">404</p>
      <h1 className="mt-3 text-2xl font-bold">This pot is empty</h1>
      <p className="mt-2 text-ink-soft">The page you were looking for isn't on the menu.</p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-full bg-primary px-5 py-2.5 font-bold text-on-primary hover:bg-primary-hover"
      >
        Back to the kitchen
      </Link>
    </div>
  )
}
