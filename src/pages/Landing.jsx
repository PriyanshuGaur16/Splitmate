import { Link } from 'react-router-dom'
import { ArrowRight, Check, Circle } from 'lucide-react'
import Logo from '../components/Logo.jsx'

const STEPS = [
  {
    n: '01',
    title: 'Open a tab',
    body: 'Start a group for your flat, a trip or tonight’s dinner. Add people by email — they don’t need an account yet to be on the tab.',
  },
  {
    n: '02',
    title: 'Log what’s owed',
    body: 'Add an expense and split it evenly, or exactly how it actually broke down. Everyone sees the same running total, always.',
  },
  {
    n: '03',
    title: 'Settle up clean',
    body: 'Splitmate works out exactly who pays whom, traced straight back to the real expenses — never a group-wide reshuffle.',
  },
]

const FEATURES = [
  {
    example: { lead: 'pending', text: 'Aditya — Dinner share', amount: '₹ 450.00' },
    label: 'Pending members',
    body: 'Add someone before they’ve signed up. They’re on the tab and owed money from day one — the moment they join, it’s already theirs.',
  },
  {
    example: { lead: 'owes', text: 'Theo → Priya, dinner only', amount: '₹ 696.67' },
    label: 'Smart settlements',
    body: 'No guessing who owes who what. Every balance is worked out from the expenses it actually came from, so nobody’s total moves because of a trip they weren’t on.',
  },
  {
    example: { lead: 'edited', text: 'Dinner — The Fig', amount: '₹ 2,190.00', was: '₹ 2,090.00' },
    label: 'Full expense history',
    body: 'Nothing on the tab quietly disappears. Every entry — added, edited, corrected — stays on the record.',
  },
  {
    example: { lead: 'added', text: 'Auto fare, 9:42 pm', amount: '₹ 180.00' },
    label: 'Built for your phone',
    body: 'Add an expense from the group chat, the car, the checkout line. The tab keeps up with you.',
  },
]

const HERO_ROWS = [
  { name: 'Maya', item: 'Groceries', amount: '₹ 1,240.00', status: 'settled' },
  { name: 'Theo', item: 'Auto fare', amount: '₹ 360.00', status: 'pending' },
  { name: 'Priya', item: 'Dinner — The Fig', amount: '₹ 2,090.00', status: 'paid' },
]

export default function Landing() {
  return (
    <div className="ledger-surface min-h-screen bg-paper font-sans text-ink">
      <header className="border-b border-rule">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
          <Logo />
          <Link
            to="/login"
            className="-my-2 py-2 font-medium text-ink-soft transition hover:text-ink"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-5xl px-4 pb-16 pt-14 sm:pb-24 sm:pt-20">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16">
            <div className="stamp-in">
              <h1 className="font-display text-4xl font-semibold leading-[1.08] tracking-[-0.02em] text-ink sm:text-5xl lg:text-[3.25rem]">
                Every friend group runs a tab.{' '}
                <span className="box-decoration-clone bg-stamp px-2 text-paper">Yours should add up.</span>
              </h1>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-soft">
                Splitmate logs who paid, who owes, and settles it in one clean move.
                No spreadsheets, no group-chat math, no chasing anyone for rent.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-6">
                <Link
                  to="/register"
                  className="group inline-flex items-center gap-2 border-2 border-ink bg-stamp px-6 py-3 font-display text-base font-semibold text-ink transition hover:bg-stamp-dark hover:text-paper"
                >
                  Open a tab
                  <ArrowRight
                    size={18}
                    strokeWidth={2.5}
                    className="transition group-hover:translate-x-0.5"
                  />
                </Link>
                <Link
                  to="/login"
                  className="font-medium text-ink-soft underline decoration-rule decoration-2 underline-offset-4 transition hover:text-ink hover:decoration-stamp"
                >
                  Already keeping one? Sign in
                </Link>
              </div>
            </div>

            <div
              className="stamp-in border border-rule bg-paper"
              style={{ animationDelay: '120ms' }}
            >
              <div className="flex items-baseline justify-between border-b border-rule px-5 py-3">
                <span className="font-ledger text-xs uppercase tracking-[0.15em] text-ink-soft">
                  Flat 4B — the tab
                </span>
                <span className="font-ledger text-xs text-ink-soft">Oct</span>
              </div>

              <div className="divide-y divide-rule">
                {HERO_ROWS.map((row, i) => (
                  <div
                    key={row.name}
                    className="stamp-in flex items-center justify-between px-5 py-3.5"
                    style={{ animationDelay: `${200 + i * 90}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      {row.status === 'pending' ? (
                        <Circle size={16} strokeWidth={2.5} className="text-ink-soft" aria-label="Pending" />
                      ) : (
                        <Check size={16} strokeWidth={3} className="text-ink" aria-label="Paid" />
                      )}
                      <div>
                        <p className="font-medium text-ink">{row.name}</p>
                        <p className="text-sm text-ink-soft">{row.item}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {row.status === 'settled' && (
                        <span className="-rotate-2 border-2 border-stamp-dark px-1.5 py-0.5 font-ledger text-xs font-bold uppercase tracking-[0.1em] text-stamp-dark">
                          Settled
                        </span>
                      )}
                      <p className="font-ledger text-ink">{row.amount}</p>
                    </div>
                  </div>
                ))}

                <div
                  className="stamp-in flex items-center justify-between bg-ink px-5 py-3.5"
                  style={{ animationDelay: '480ms' }}
                >
                  <div className="flex items-center gap-2">
                    <Check size={16} strokeWidth={3} className="text-stamp" />
                    <span className="font-ledger text-sm uppercase tracking-[0.1em] text-paper">
                      Priya is owed
                    </span>
                  </div>
                  <p className="font-ledger text-lg font-bold text-stamp">+₹ 860.00</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-rule bg-paper">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
            <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
              How it works
            </h2>
            <div className="mt-10 grid gap-10 sm:grid-cols-3 sm:gap-8">
              {STEPS.map((step) => (
                <div key={step.n} className="border-t-2 border-ink pt-4">
                  <span className="font-ledger text-sm text-stamp-dark">{step.n}</span>
                  <h3 className="mt-2 font-display text-xl font-semibold text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-2 leading-relaxed text-ink-soft">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-rule">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
            <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
              What’s actually on the tab
            </h2>
            <div className="mt-10 divide-y divide-rule border-y border-rule">
              {FEATURES.map((f) => (
                <div
                  key={f.label}
                  className="grid gap-3 py-6 sm:grid-cols-[13rem_1fr_15rem] sm:items-start sm:gap-8"
                >
                  <p className="font-ledger text-sm uppercase tracking-[0.1em] text-ink">
                    {f.label}
                  </p>
                  <p className="max-w-xl leading-relaxed text-ink-soft">{f.body}</p>
                  <div className="font-ledger text-sm text-ink sm:text-right">
                    <p className="text-xs uppercase tracking-[0.1em] text-ink-soft">
                      {f.example.lead}
                    </p>
                    <p>{f.example.text}</p>
                    <p>
                      {f.example.was && (
                        <span className="mr-2 text-ink-soft line-through">{f.example.was}</span>
                      )}
                      {f.example.amount}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Social proof */}
        {/* PLACEHOLDER: no real testimonials or usage data exist yet.
            Replace this quote and the example-tab stat with real content
            before shipping (confirmed with user during /impeccable redesign). */}
        <section className="border-t border-rule">
          <div className="mx-auto grid max-w-5xl gap-10 px-4 py-16 sm:py-20 lg:grid-cols-[1.3fr_1fr] lg:gap-16">
            <blockquote className="border-t-2 border-ink pt-6">
              <p className="font-display text-xl leading-snug text-ink sm:text-2xl">
                &ldquo;We used to spend the whole drive home arguing about who owed
                what. Now nobody even brings it up — it’s just already
                settled.&rdquo;
              </p>
              <footer className="mt-4 font-ledger text-sm uppercase tracking-[0.1em] text-ink-soft">
                — a flat of four, six months on Splitmate
              </footer>
            </blockquote>

            <div className="border border-rule p-6">
              <p className="font-ledger text-xs uppercase tracking-[0.15em] text-stamp-dark">
                Tab #04 — example
              </p>
              <dl className="mt-4 space-y-3">
                <div className="flex items-baseline justify-between border-b border-rule pb-2">
                  <dt className="text-sm text-ink-soft">Goa trip, 4 people</dt>
                  <dd className="font-ledger text-ink">19 expenses</dd>
                </div>
                <div className="flex items-baseline justify-between">
                  <dt className="text-sm text-ink-soft">Settled in</dt>
                  <dd className="font-ledger text-ink">3 payments</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-cover">
          <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:py-20">
            <h2 className="font-display text-3xl font-semibold text-paper sm:text-4xl">
              Start your first tab.
            </h2>
            <p className="mt-3 text-lg text-paper/70">
              Free to open. No credit card, no catch.
            </p>
            <Link
              to="/register"
              className="mt-8 inline-flex items-center gap-2 border-2 border-stamp bg-stamp px-7 py-3.5 font-display text-base font-semibold text-ink transition hover:bg-transparent hover:text-stamp"
            >
              Open a tab
              <ArrowRight size={18} strokeWidth={2.5} />
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
