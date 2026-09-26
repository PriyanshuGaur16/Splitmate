import { Link } from 'react-router-dom'
import Logo from '../components/Logo.jsx'

const FEATURES = [
  {
    title: 'Create groups',
    body: 'Set up a group for your flat, a trip or a night out and invite friends by email.',
  },
  {
    title: 'Track shared expenses',
    body: 'Log who paid for what and split it equally in seconds. Everyone sees the same list.',
  },
  {
    title: 'See who owes what',
    body: 'Splitmate works out the fewest payments needed so everyone gets square.',
  },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <Logo />
        <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          Sign in
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-4">
        <section className="py-16 text-center sm:py-24">
          <h1 className="mx-auto max-w-2xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Split expenses with friends,{' '}
            <span className="text-emerald-600">without the awkward maths.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600">
            Splitmate keeps track of shared costs in your groups and tells everyone exactly who owes
            whom.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/register"
              className="rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              Get started
            </Link>
            <p className="text-sm text-slate-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-emerald-700 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </section>

        <section className="grid gap-6 pb-24 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h2 className="font-semibold text-slate-900">{f.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{f.body}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  )
}
