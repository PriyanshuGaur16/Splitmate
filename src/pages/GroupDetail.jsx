import useDocumentTitle from '../hooks/useDocumentTitle.js'
import { useCallback, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import * as storage from '../data/storage.js'
import AddExpenseModal from '../components/AddExpenseModal.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import { computeSettlements } from '../utils/balances.js'
import { formatMoney } from '../utils/money.js'
import { formatDate } from '../utils/dates.js'
import { downloadGroupHistory } from '../utils/groupExport'

// Section heading: a 2px ink rule over a ledger-style caps label.
const sectionHeading =
  'border-t-2 border-ink pt-2 font-ledger text-xs font-bold tracking-[0.15em] text-ink-soft uppercase'

const tagClass =
  'shrink-0 border border-ink-soft/50 px-1.5 py-0.5 font-ledger text-xs tracking-wider text-ink-soft uppercase'

function SettleButton({ settlement, label, onSettle, busy, saving, confirming, onAsk, onCancel }) {
  if (confirming && !saving) {
    return (
      <span className="mt-3 flex items-center gap-2 text-sm">
        <button
          type="button"
          onClick={() => onSettle(settlement)}
          disabled={busy}
          aria-label={`Confirm: ${label}`}
          className="min-h-10 flex-1 border-2 border-ink bg-ink px-3 font-semibold text-paper hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          Confirm
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="min-h-10 px-3 font-medium text-ink-soft hover:text-ink hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={() => onAsk(settlement)}
      disabled={busy}
      aria-label={label}
      className="mt-3 min-h-10 w-full border-2 border-ink bg-white px-3 text-sm font-semibold text-ink hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-ink"
    >
      {saving ? 'Saving…' : 'Settle up'}
    </button>
  )
}

function SettlementRow({ settlement, memberName, myMemberId, onSettle, settlingKey, confirmingKey, onAsk, onCancel }) {
  const { from, to, amount } = settlement
  // Every button is disabled while any settlement is being saved; only the
  // clicked one shows "Saving…".
  const busy = settlingKey !== null
  const key = `${from}-${to}`
  const saving = settlingKey === key
  const confirming = confirmingKey === key
  if (from === myMemberId) {
    return (
      <li className="border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-medium text-ink">You owe {memberName(to)}</p>
        <p className="mt-0.5 font-ledger text-2xl font-bold text-red-700 tabular-nums">
          <span className="sr-only">minus </span>
          <span aria-hidden="true">−</span>
          {formatMoney(amount)}
        </p>
        <SettleButton
          settlement={settlement}
          label={`Settle up: you pay ${memberName(to)} ${formatMoney(amount)}`}
          onSettle={onSettle}
          busy={busy}
          saving={saving}
          confirming={confirming}
          onAsk={onAsk}
          onCancel={onCancel}
        />
      </li>
    )
  }
  if (to === myMemberId) {
    return (
      <li className="border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-medium text-ink">{memberName(from)} owes you</p>
        <p className="mt-0.5 font-ledger text-2xl font-bold text-emerald-700 tabular-nums">
          <span className="sr-only">plus </span>
          <span aria-hidden="true">+</span>
          {formatMoney(amount)}
        </p>
        <SettleButton
          settlement={settlement}
          label={`Settle up: record that ${memberName(from)} paid you ${formatMoney(amount)}`}
          onSettle={onSettle}
          busy={busy}
          saving={saving}
          confirming={confirming}
          onAsk={onAsk}
          onCancel={onCancel}
        />
      </li>
    )
  }
  return (
    <li className="flex items-baseline justify-between gap-3 px-1 py-2 text-sm text-ink-soft">
      <span className="min-w-0">
        {memberName(from)} owes {memberName(to)}
      </span>
      <span className="shrink-0 font-ledger tabular-nums">{formatMoney(amount)}</span>
    </li>
  )
}

function MemberRow({ member, isMe }) {
  const pending = member.status === 'pending'
  return (
    <li className="flex items-center justify-between gap-3 border-b border-rule py-2.5 last:border-b-0">
      <span className={`min-w-0 truncate text-sm ${pending ? 'text-ink-soft' : 'font-medium text-ink'}`}>
        {member.name}
        {isMe && <span className="font-normal text-ink-soft"> (you)</span>}
      </span>
      {pending ? (
        <span className="flex shrink-0 items-center gap-1.5 font-ledger text-xs font-bold tracking-wider text-stamp-dark uppercase">
          <span aria-hidden="true" className="size-2 border-2 border-stamp-dark" />
          Pending
        </span>
      ) : (
        <span className="flex shrink-0 items-center gap-1.5 font-ledger text-xs font-bold tracking-wider text-ink-soft uppercase">
          <span aria-hidden="true" className="size-2 bg-ink" />
          Active
        </span>
      )}
    </li>
  )
}

export default function GroupDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [editingExpenseId, setEditingExpenseId] = useState(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null)
  // Bumped after every write so the expense list re-reads from storage.
  const [version, setVersion] = useState(0)
  // Key ("from-to") of the settlement being recorded, to block double-clicks.
  const [settlingKey, setSettlingKey] = useState(null)
  const [settleError, setSettleError] = useState('')
  // Key of the settlement awaiting inline Confirm/Cancel.
  const [confirmingKey, setConfirmingKey] = useState(null)

  const group = useMemo(() => storage.getGroup(id), [id])
  useDocumentTitle(group?.name ?? 'Group')
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
    const list = computeSettlements(group.members, expenses, storage.getSettlementsForGroup(group.id))
    // Payments involving the current user go first.
    const involvesMe = (s) => s.from === me?.id || s.to === me?.id
    return list.sort((a, b) => involvesMe(b) - involvesMe(a))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- version forces a re-read after settling
  }, [group, expenses, me, version])

  const closeModal = useCallback(() => {
    setShowModal(false)
    setEditingExpenseId(null)
  }, [])

  const editingExpense = editingExpenseId ? expenses.find((e) => e.id === editingExpenseId) : null

  if (!group || !me) {
    return (
      <div className="border border-rule bg-white p-10 text-center">
        <p className="font-display text-xl font-semibold text-ink">Group not found</p>
        <p className="mt-1 text-sm text-ink-soft">It may not exist, or you're not a member.</p>
        <Link
          to="/dashboard"
          className="mt-4 inline-block text-sm font-semibold text-stamp-dark underline underline-offset-4 hover:text-ink"
        >
          Back to dashboard
        </Link>
      </div>
    )
  }

  const memberById = Object.fromEntries(group.members.map((m) => [m.id, m]))
  const memberName = (memberId) => (memberId === me.id ? 'You' : (memberById[memberId]?.name ?? 'Unknown'))

  // Totals of what the current user owes / is owed, from the pairwise debts.
  const iOwe = settlements.filter((s) => s.from === me.id).reduce((sum, s) => sum + s.amount, 0)
  const owedToMe = settlements.filter((s) => s.to === me.id).reduce((sum, s) => sum + s.amount, 0)

  function handleSave(data) {
    // Add the replacement before deleting the original so a failed save
    // (e.g. shares not summing to the total) never leaves the expense gone
    // with nothing to replace it.
    storage.addExpense({ ...data, groupId: group.id, createdBy: user.id })
    if (editingExpenseId) {
      storage.softDeleteExpense(editingExpenseId, user.id)
    }
    setShowModal(false)
    setEditingExpenseId(null)
    setVersion((v) => v + 1)
  }

  // Records the full pairwise amount as paid from the debtor to the creditor.
  function handleAskSettle(s) {
    setSettleError('')
    setConfirmingKey(`${s.from}-${s.to}`)
  }

  async function handleSettle(s) {
    const key = `${s.from}-${s.to}`
    if (settlingKey) return
    setSettlingKey(key)
    setConfirmingKey(null)
    setSettleError('')
    try {
      // Every Settle button stays disabled until the write has finished (and,
      // if it failed, the cache has been re-synced from the server).
      const result = await storage.addSettlement({
        groupId: group.id,
        from: s.from,
        to: s.to,
        amount: s.amount,
        createdBy: user.id,
      })
      if (result.error) setSettleError(result.error)
    } catch (err) {
      setSettleError(err.message || 'Could not record the settlement.')
    } finally {
      setVersion((v) => v + 1)
      setSettlingKey(null)
    }
  }

  function handleDelete(expenseId) {
    storage.softDeleteExpense(expenseId, user.id)
    setConfirmingDeleteId(null)
    setVersion((v) => v + 1)
  }

  return (
    <>
      <div className="ledger-surface">
        <Link
          to="/dashboard"
          className="inline-flex min-h-8 items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
        >
          <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M10 3 5 8l5 5" strokeLinecap="square" />
          </svg>
          Back to dashboard
        </Link>

        <header className="mt-3 flex flex-wrap items-end justify-between gap-4 border-t-2 border-ink pt-4">
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              {group.name}
            </h1>
            <p className="mt-1 font-ledger text-sm text-ink-soft">
              {group.members.length} {group.members.length === 1 ? 'member' : 'members'} · {expenses.length}{' '}
              {expenses.length === 1 ? 'expense' : 'expenses'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => downloadGroupHistory(group.id, group.name)}
              disabled={expenses.length === 0}
              title={expenses.length === 0 ? 'No expenses to export yet' : undefined}
              className="min-h-11 border border-ink bg-transparent px-4 text-sm font-semibold text-ink hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
            >
              Export history
            </button>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="min-h-11 border-2 border-ink bg-stamp px-5 font-display font-semibold text-ink hover:bg-stamp-dark hover:text-paper"
            >
              Add expense
            </button>
          </div>
        </header>

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start lg:gap-8">
          {/* Main column: the expense ledger */}
          <section aria-labelledby="expenses-heading">
            <h2 id="expenses-heading" className={sectionHeading}>
              Expenses
            </h2>
            {expenses.length === 0 ? (
              <div className="mt-4 border border-dashed border-ink-soft/60 bg-white px-6 py-12 text-center">
                <p className="font-display text-xl font-semibold text-ink">No expenses yet</p>
                <p className="mt-1 text-sm text-ink-soft">Add one and balances will appear here.</p>
                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="mt-5 min-h-11 border-2 border-ink bg-stamp px-5 font-display font-semibold text-ink hover:bg-stamp-dark hover:text-paper"
                >
                  Add the first one
                </button>
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {expenses.map((expense) => {
                  const shares = expense.shares ? Object.entries(expense.shares) : []
                  return (
                    <li key={expense.id} className="border border-rule bg-white">
                      <div className="flex items-start justify-between gap-4 p-4 sm:p-5">
                        <div className="min-w-0">
                          <h3 className="font-display text-xl leading-snug font-semibold break-words text-ink">
                            {expense.description}
                          </h3>
                          <p className="mt-1 text-sm text-ink-soft">
                            Paid by{' '}
                            <span className="font-semibold text-ink">
                              {expense.paidBy === me.id ? 'You' : (memberById[expense.paidBy]?.name ?? 'Unknown')}
                            </span>{' '}
                            · {formatDate(expense.date)}
                          </p>
                        </div>
                        <p className="shrink-0 font-ledger text-2xl font-bold text-ink tabular-nums">
                          {formatMoney(expense.amount)}
                        </p>
                      </div>

                      {(expense.category || expense.splitType === 'exact') && (
                        <div className="flex flex-wrap gap-2 px-4 sm:px-5">
                          {expense.category && <span className={tagClass}>{expense.category}</span>}
                          {expense.splitType === 'exact' && <span className={tagClass}>Unequal split</span>}
                        </div>
                      )}

                      {expense.notes && (
                        <p className="px-4 pt-3 text-sm whitespace-pre-line text-ink-soft sm:px-5">{expense.notes}</p>
                      )}

                      {shares.length > 0 && (
                        <p className="flex flex-wrap gap-x-4 gap-y-1 px-4 pt-3 text-xs text-ink-soft sm:px-5">
                          <span className="font-semibold">Split</span>
                          {shares.map(([memberId, cents]) => (
                            <span key={memberId}>
                              {memberName(memberId)} <span className="font-ledger text-ink">{formatMoney(cents)}</span>
                            </span>
                          ))}
                        </p>
                      )}

                      <div className="mt-3 flex items-center justify-end gap-1 border-t border-rule px-2 py-1 sm:px-3">
                        {confirmingDeleteId === expense.id ? (
                          <>
                            <span className="mr-auto pl-2 text-sm text-ink-soft">Delete this expense?</span>
                            <button
                              type="button"
                              onClick={() => handleDelete(expense.id)}
                              aria-label={`Confirm delete ${expense.description}`}
                              className="min-h-9 bg-red-700 px-3 text-sm font-semibold text-white hover:bg-red-800"
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmingDeleteId(null)}
                              aria-label={`Keep ${expense.description}`}
                              className="min-h-9 px-3 text-sm font-medium text-ink-soft hover:text-ink hover:underline"
                            >
                              Keep
                            </button>
                          </>
                        ) : (
                          <>
                            {expense.createdBy === user.id && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingExpenseId(expense.id)
                                  setShowModal(true)
                                }}
                                className="min-h-9 px-3 text-sm font-medium text-ink-soft hover:bg-paper hover:text-ink"
                                aria-label={`Edit ${expense.description}`}
                              >
                                Edit
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setConfirmingDeleteId(expense.id)}
                              className="min-h-9 px-3 text-sm font-medium text-ink-soft hover:bg-red-50 hover:text-red-700"
                              aria-label={`Delete ${expense.description}`}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {/* Supporting column: balances, then members */}
          <div className="space-y-10">
            <section aria-labelledby="balances-heading">
              <h2 id="balances-heading" className={sectionHeading}>
                Balances
              </h2>

              {settlements.length === 0 ? (
                <div className="mt-4 border border-rule bg-white px-4 py-6 text-center">
                  {expenses.length === 0 ? (
                    <p className="text-sm text-ink-soft">Nothing to settle yet.</p>
                  ) : (
                    <>
                      <span className="inline-block -rotate-2 border-2 border-stamp-dark px-3 py-1 font-display text-lg font-bold tracking-wide text-stamp-dark uppercase">
                        Settled
                      </span>
                      <p className="mt-3 text-sm text-ink-soft">Everyone is settled up.</p>
                    </>
                  )}
                </div>
              ) : (
                <>
                  {(iOwe > 0 || owedToMe > 0) && (
                    <dl className="mt-4 grid grid-cols-2 border border-rule bg-white">
                      <div className="p-3">
                        <dt className="text-xs text-ink-soft">You owe</dt>
                        <dd
                          className={`mt-0.5 font-ledger text-lg font-bold tabular-nums ${iOwe > 0 ? 'text-red-700' : 'text-ink-soft'}`}
                        >
                          {formatMoney(iOwe)}
                        </dd>
                      </div>
                      <div className="border-l border-rule p-3">
                        <dt className="text-xs text-ink-soft">You're owed</dt>
                        <dd
                          className={`mt-0.5 font-ledger text-lg font-bold tabular-nums ${owedToMe > 0 ? 'text-emerald-700' : 'text-ink-soft'}`}
                        >
                          {formatMoney(owedToMe)}
                        </dd>
                      </div>
                    </dl>
                  )}
                  <ul className="mt-3 space-y-3">
                    {settlements.map((s) => (
                      <SettlementRow
                        key={`${s.from}-${s.to}`}
                        settlement={s}
                        memberName={memberName}
                        myMemberId={me.id}
                        onSettle={handleSettle}
                        settlingKey={settlingKey}
                        confirmingKey={confirmingKey}
                        onAsk={handleAskSettle}
                        onCancel={() => setConfirmingKey(null)}
                      />
                    ))}
                  </ul>
                </>
              )}
              {settleError && (
                <div className="mt-3">
                  <ErrorMessage>{settleError}</ErrorMessage>
                </div>
              )}
            </section>

            <section aria-labelledby="members-heading">
              <div className="flex items-baseline justify-between gap-3 border-t-2 border-ink pt-2">
                <h2
                  id="members-heading"
                  className="font-ledger text-xs font-bold tracking-[0.15em] text-ink-soft uppercase"
                >
                  Members ({group.members.length})
                </h2>
                {group.createdBy === user.id && (
                  <Link
                    to={`/group/${group.id}/settings`}
                    className="text-sm font-semibold text-stamp-dark underline underline-offset-4 hover:text-ink"
                  >
                    Group settings
                  </Link>
                )}
              </div>
              <ul className="mt-2">
                {group.members.map((m) => (
                  <MemberRow key={m.id} member={m} isMe={m.id === me.id} />
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>

      {showModal && (
        <AddExpenseModal
          members={group.members}
          currentMemberId={me.id}
          onSave={handleSave}
          onClose={closeModal}
          initialExpense={editingExpense}
        />
      )}
    </>
  )
}
