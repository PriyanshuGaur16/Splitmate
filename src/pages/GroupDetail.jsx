import { useCallback, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import * as storage from '../data/storage.js'
import AddExpenseModal from '../components/AddExpenseModal.jsx'
import { computeSettlements } from '../utils/balances.js'
import { formatMoney } from '../utils/money.js'
import { formatDate } from '../utils/dates.js'

function SettlementRow({ settlement, memberName, myMemberId }) {
  const { from, to, amount } = settlement
  if (from === myMemberId) {
    return (
      <li className="rounded-lg bg-red-50 px-4 py-3 font-semibold text-red-700">
        You owe {memberName(to)} {formatMoney(amount)}
      </li>
    )
  }
  if (to === myMemberId) {
    return (
      <li className="rounded-lg bg-emerald-50 px-4 py-3 font-semibold text-emerald-700">
        {memberName(from)} owes you {formatMoney(amount)}
      </li>
    )
  }
  return (
    <li className="px-4 py-1.5 text-sm text-slate-500">
      {memberName(from)} owes {memberName(to)} {formatMoney(amount)}
    </li>
  )
}

export default function GroupDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null)
  // Bumped after every write so the expense list re-reads from storage.
  const [version, setVersion] = useState(0)

  const group = useMemo(() => storage.getGroup(id), [id])
  const expenses = useMemo(
    () => {
      const list = storage.getExpensesForGroup(id)
      // Newest first; ties broken by when they were entered.
      return list.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- version forces a re-read after writes
    [id, version],
  )

  const me = group?.members.find((m) => m.userId === user.id && m.status === 'active')

  const settlements = useMemo(() => {
    if (!group) return []
    const list = computeSettlements(group.members, expenses)
    // Payments involving the current user go first.
    const involvesMe = (s) => s.from === me?.id || s.to === me?.id
    return list.sort((a, b) => involvesMe(b) - involvesMe(a))
  }, [group, expenses, me])

  const closeModal = useCallback(() => setShowModal(false), [])

  if (!group || !me) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
        <p className="font-medium text-slate-900">Group not found</p>
        <p className="mt-1 text-sm text-slate-500">It may not exist, or you're not a member.</p>
        <Link to="/dashboard" className="mt-4 inline-block text-sm font-medium text-emerald-700 hover:underline">
          Back to dashboard
        </Link>
      </div>
    )
  }

  const memberById = Object.fromEntries(group.members.map((m) => [m.id, m]))
  const memberName = (memberId) => (memberId === me.id ? 'You' : (memberById[memberId]?.name ?? 'Unknown'))

  function handleSave(data) {
    storage.addExpense({ ...data, groupId: group.id, createdBy: user.id })
    setShowModal(false)
    setVersion((v) => v + 1)
  }

  function handleDelete(expenseId) {
    storage.softDeleteExpense(expenseId, user.id)
    setConfirmingDeleteId(null)
    setVersion((v) => v + 1)
  }

  return (
    <div>
      <Link to="/dashboard" className="text-sm text-slate-500 hover:text-slate-800">
        ← Back to dashboard
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">{group.name}</h1>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Add expense
        </button>
      </div>

      <section className="mt-6">
        <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
          Members ({group.members.length})
        </h2>
        <ul className="mt-2 flex flex-wrap gap-2">
          {group.members.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm"
            >
              <span className="text-slate-800">{m.id === me.id ? `${m.name} (you)` : m.name}</span>
              {m.status === 'pending' && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  pending
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">Expenses</h2>
        {expenses.length === 0 ? (
          <div className="mt-2 rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-10 text-center">
            <p className="text-slate-600">No expenses yet.</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-3 text-sm font-medium text-emerald-700 hover:underline"
            >
              Add the first one
            </button>
          </div>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
            {expenses.map((expense) => (
              <li key={expense.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium text-slate-900">
                    <span className="truncate">{expense.description}</span>
                    {expense.splitType === 'exact' && (
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        unequal split
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-slate-500">
                    {expense.paidBy === me.id ? 'You' : memberById[expense.paidBy]?.name} paid ·{' '}
                    {formatDate(expense.date)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-semibold text-slate-900 tabular-nums">{formatMoney(expense.amount)}</span>
                  {confirmingDeleteId === expense.id ? (
                    <span className="flex items-center gap-1 text-sm">
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="rounded-md bg-red-600 px-2 py-1 font-medium text-white hover:bg-red-700"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setConfirmingDeleteId(null)}
                        className="rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100"
                      >
                        Keep
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmingDeleteId(expense.id)}
                      className="rounded-md px-2 py-1 text-sm text-slate-400 hover:bg-red-50 hover:text-red-600"
                      aria-label={`Delete ${expense.description}`}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">Balances</h2>
        {settlements.length === 0 ? (
          <p className="mt-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-slate-500">
            Everyone is settled up.
          </p>
        ) : (
          <ul className="mt-2 space-y-2 rounded-2xl border border-slate-200 bg-white p-3">
            {settlements.map((s) => (
              <SettlementRow key={`${s.from}-${s.to}`} settlement={s} memberName={memberName} myMemberId={me.id} />
            ))}
          </ul>
        )}
      </section>

      {showModal && (
        <AddExpenseModal
          members={group.members}
          currentMemberId={me.id}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
