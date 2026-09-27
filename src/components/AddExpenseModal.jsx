import { useEffect, useState } from 'react'
import ErrorMessage from './ErrorMessage.jsx'
import { centsToInput, formatMoney, parseToCents, splitEqually, sumCents } from '../utils/money.js'
import { todayISO } from '../utils/dates.js'

const inputClass =
  'mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none'

const SPLIT_MODES = [
  ['equal', 'Equally'],
  ['exact', 'Exact amounts'],
]

// Calls onSave({ description, amount, date, paidBy, shares, splitType }) with amounts in cents.
export default function AddExpenseModal({ members, currentMemberId, onSave, onClose, initialExpense }) {
  const [description, setDescription] = useState(() => initialExpense?.description ?? '')
  const [amountInput, setAmountInput] = useState(() =>
    initialExpense ? centsToInput(initialExpense.amount) : ''
  )
  const [date, setDate] = useState(() => initialExpense?.date ?? todayISO())
  const [paidBy, setPaidBy] = useState(() => initialExpense?.paidBy ?? currentMemberId)
  const [sharedBy, setSharedBy] = useState(() =>
    initialExpense ? Object.keys(initialExpense.shares) : members.map((m) => m.id)
  )
  const [splitMode, setSplitMode] = useState(() => initialExpense?.splitType ?? 'equal')
  // Typed amounts for exact mode, keyed by member id. Stays empty until the
  // user edits one, so untouched inputs simply follow the equal split.
  const [manual, setManual] = useState(() =>
    initialExpense && initialExpense.splitType === 'exact'
      ? Object.fromEntries(Object.entries(initialExpense.shares).map(([id, cents]) => [id, centsToInput(cents)]))
      : {}
  )
  const [manualTouched, setManualTouched] = useState(() => initialExpense?.splitType === 'exact')
  const [error, setError] = useState('')

  // Close on Escape and stop the page behind from scrolling.
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  const amount = parseToCents(amountInput)
  // Keep member order stable so leftover cents always go to the same people.
  const orderedSharers = members.map((m) => m.id).filter((id) => sharedBy.includes(id))
  const equalShares = amount ? splitEqually(amount, orderedSharers) : {}

  // What each checked member's exact-amount input shows. Until the user edits
  // one, it mirrors the equal split (including when the total changes).
  function inputValue(memberId) {
    if (manualTouched) return manual[memberId] ?? ''
    return amount ? centsToInput(equalShares[memberId] ?? 0) : ''
  }

  // Exact mode: parse every checked member's input. Empty counts as $0.
  const exactShares = {}
  let hasInvalidAmount = false
  if (splitMode === 'exact') {
    for (const id of orderedSharers) {
      const raw = inputValue(id).trim()
      const cents = raw === '' ? 0 : parseToCents(raw)
      if (cents === null) hasInvalidAmount = true
      else exactShares[id] = cents
    }
  }
  const assigned = sumCents(exactShares)
  const remaining = amount ? amount - assigned : null

  const shares = splitMode === 'equal' ? equalShares : exactShares

  function toggleSharer(memberId) {
    setSharedBy((current) =>
      current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId],
    )
  }

  function editExactAmount(memberId, value) {
    if (!manualTouched) {
      // First edit: freeze what is on screen so only this input changes.
      const frozen = {}
      for (const id of orderedSharers) frozen[id] = inputValue(id)
      setManual({ ...frozen, [memberId]: value })
      setManualTouched(true)
    } else {
      setManual((current) => ({ ...current, [memberId]: value }))
    }
    setError('')
  }

  function resetToEqual() {
    setManual({})
    setManualTouched(false)
    setError('')
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!description.trim()) return setError('Please say what the expense was for.')
    if (!amount || amount <= 0) return setError('Please enter an amount greater than zero.')
    if (!date) return setError('Please pick a date.')
    if (orderedSharers.length === 0) return setError('Pick at least one person to share it.')

    if (splitMode === 'exact') {
      if (hasInvalidAmount) {
        return setError('Each amount must be a number with at most 2 decimal places.')
      }
      if (assigned !== amount) {
        return setError(
          `Amounts add up to ${formatMoney(assigned)}, but the total is ${formatMoney(amount)}.`,
        )
      }
    }

    // Anyone left at $0 is not part of the split.
    const finalShares = Object.fromEntries(Object.entries(shares).filter(([, cents]) => cents > 0))
    if (Object.keys(finalShares).length === 0) {
      return setError('At least one person must have a share.')
    }
    onSave({ description, amount, date, paidBy, shares: finalShares, splitType: splitMode })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-expense-title"
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:max-w-md sm:rounded-2xl"
      >
        <h2 id="add-expense-title" className="text-lg font-semibold text-slate-900">
          {initialExpense ? 'Edit expense' : 'Add expense'}
        </h2>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <ErrorMessage>{error}</ErrorMessage>

          <div>
            <label htmlFor="expense-description" className="block text-sm font-medium text-slate-700">
              What was it for?
            </label>
            <input
              id="expense-description"
              autoFocus
              placeholder="e.g. Dinner at Toit"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="expense-amount" className="block text-sm font-medium text-slate-700">
                Total amount
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3 mt-0.5 -translate-y-1/2 text-slate-400">
                  $
                </span>
                <input
                  id="expense-amount"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className={`${inputClass} pl-7`}
                />
              </div>
            </div>
            <div>
              <label htmlFor="expense-date" className="block text-sm font-medium text-slate-700">
                Date
              </label>
              <input
                id="expense-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="expense-paid-by" className="block text-sm font-medium text-slate-700">
              Who paid?
            </label>
            <select
              id="expense-paid-by"
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className={inputClass}
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id === currentMemberId ? `${m.name} (you)` : m.name}
                </option>
              ))}
            </select>
          </div>

          <fieldset>
            <div className="flex items-center justify-between gap-3">
              <legend className="text-sm font-medium text-slate-700">Split between</legend>
              <div className="flex rounded-lg bg-slate-100 p-0.5 text-sm" role="group" aria-label="Split type">
                {SPLIT_MODES.map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={splitMode === mode}
                    onClick={() => {
                      setSplitMode(mode)
                      setError('')
                    }}
                    className={`rounded-md px-3 py-1 font-medium ${
                      splitMode === mode
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
              {members.map((m) => {
                const checked = sharedBy.includes(m.id)
                const label = m.id === currentMemberId ? `${m.name} (you)` : m.name
                return (
                  <li key={m.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <label className="flex min-w-0 cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSharer(m.id)}
                        className="h-4 w-4 accent-emerald-600"
                      />
                      <span className="truncate text-slate-800">{label}</span>
                    </label>
                    {splitMode === 'exact' && checked ? (
                      <div className="relative w-28 shrink-0">
                        <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-slate-400">
                          $
                        </span>
                        <input
                          inputMode="decimal"
                          placeholder="0.00"
                          aria-label={`Amount for ${label}`}
                          value={inputValue(m.id)}
                          onChange={(e) => editExactAmount(m.id, e.target.value)}
                          className="block w-full rounded-md border border-slate-300 py-1 pr-2 pl-6 text-right text-slate-900 tabular-nums focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                        />
                      </div>
                    ) : (
                      <span className={`shrink-0 tabular-nums ${checked ? 'text-slate-700' : 'text-slate-300'}`}>
                        {checked && amount ? formatMoney(shares[m.id] ?? 0) : '—'}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>

            {splitMode === 'exact' && (
              <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                {remaining === null ? (
                  <span className="text-slate-400">Enter a total to see what is left.</span>
                ) : hasInvalidAmount ? (
                  <span className="text-red-600">Check the amounts entered.</span>
                ) : remaining === 0 ? (
                  <span className="font-medium text-emerald-600">Adds up ✓</span>
                ) : remaining > 0 ? (
                  <span className="font-medium text-amber-600">{formatMoney(remaining)} left to assign</span>
                ) : (
                  <span className="font-medium text-red-600">{formatMoney(-remaining)} over</span>
                )}
                {manualTouched && (
                  <button
                    type="button"
                    onClick={resetToEqual}
                    className="text-slate-500 underline hover:text-slate-800"
                  >
                    Reset to equal split
                  </button>
                )}
              </div>
            )}
          </fieldset>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
