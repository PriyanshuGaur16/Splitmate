import useDocumentTitle from '../hooks/useDocumentTitle.js'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import { getGroupsForUser, getExpensesForGroup } from '../data/storage.js'
import { formatMoney } from '../utils/money.js'
import { formatDate, todayISO } from '../utils/dates.js'
import { buildCsv, downloadCsv } from '../utils/csvExport.js'
import {
  DEFAULT_RANGE,
  RANGE_PRESETS,
  REPORT_CSV_COLUMNS,
  REPORT_CSV_RAW_COLUMNS,
  amountFor,
  buildMonthlyReport,
  collectRows,
  filterRows,
  isValidISODate,
  monthLabel,
  reportFilename,
  resolveRange,
  sortRowsAscending,
  sortRowsDescending,
  toCsvRows,
} from '../utils/monthlyReport.js'

const PAGE_SIZE = 50
const inputClass =
  'mt-1 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30'

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  )
}

function EmptyCard({ title, children }) {
  return (
    <div className="mt-6 rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-12 text-center">
      <p className="font-medium text-slate-900">{title}</p>
      <div className="mt-1 text-sm text-slate-600">{children}</div>
    </div>
  )
}

function MonthlyChart({ months, view }) {
  const max = Math.max(0, ...months.map((m) => m.total))
  const years = new Set(months.map((m) => m.key.slice(0, 4)))
  const withYear = !(years.size === 1 && months.length > 6)
  const PLOT_HEIGHT = 160

  return (
    <div className="mt-4 flex gap-2">
      <div
        className="flex shrink-0 flex-col justify-between pb-6 text-right text-xs text-slate-600"
        style={{ height: PLOT_HEIGHT + 24 }}
        aria-hidden="true"
      >
        <span>{formatMoney(max)}</span>
        <span>{formatMoney(0)}</span>
      </div>
      <ul className="flex min-w-0 flex-1 gap-1 overflow-x-auto" aria-label={`Spending by month, ${view === 'total' ? 'group total' : 'my share'}`}>
        {months.map((m) => {
          const label = monthLabel(m.key, withYear)
          const height = max > 0 ? Math.round((m.total / max) * PLOT_HEIGHT) : 0
          return (
            <li
              key={m.key}
              tabIndex={0}
              title={`${monthLabel(m.key)}: ${formatMoney(m.total)}`}
              aria-label={`${monthLabel(m.key)}: ${formatMoney(m.total)}`}
              className="group flex min-w-14 flex-1 flex-col items-center justify-end rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              <span className="mb-1 text-xs font-medium text-slate-700">{formatMoney(m.total)}</span>
              <div className="flex w-full items-end justify-center border-b border-slate-300" style={{ height: PLOT_HEIGHT }}>
                {height > 0 && (
                  <div
                    className="w-3/5 rounded-t bg-emerald-600 group-hover:bg-emerald-700 group-focus:bg-emerald-700"
                    style={{ height }}
                  />
                )}
              </div>
              <span className="mt-1 h-5 whitespace-nowrap text-xs text-slate-600">{label}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function ExpenseTable({ rows, view }) {
  const [shown, setShown] = useState(PAGE_SIZE)
  const visible = rows.slice(0, shown)

  return (
    <>
      <table className="mt-4 hidden w-full text-left text-sm sm:table">
        <thead className="text-slate-600">
          <tr className="border-b border-slate-200">
            <th scope="col" className="py-2 pr-3 font-medium">Date</th>
            <th scope="col" className="py-2 pr-3 font-medium">Description</th>
            <th scope="col" className="py-2 pr-3 font-medium">Group</th>
            <th scope="col" className="py-2 pr-3 font-medium">Category</th>
            <th scope="col" className="py-2 pr-3 font-medium">Paid by</th>
            <th scope="col" className="py-2 pr-3 text-right font-medium">Total</th>
            <th scope="col" className="py-2 text-right font-medium">My share</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((r) => (
            <tr key={r.id} className="border-b border-slate-100 align-top">
              <td className="whitespace-nowrap py-2 pr-3 text-slate-600">{formatDate(r.date)}</td>
              <td className="py-2 pr-3">
                <Link to={`/group/${r.groupId}`} className="font-medium text-emerald-700 hover:underline">
                  {r.description}
                </Link>
              </td>
              <td className="py-2 pr-3 text-slate-700">{r.groupName}</td>
              <td className="py-2 pr-3 text-slate-700">{r.category}</td>
              <td className="py-2 pr-3 text-slate-700">{r.paidByMe ? 'You' : r.paidByName}</td>
              <td className={`py-2 pr-3 text-right ${view === 'total' ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                {formatMoney(r.total)}
              </td>
              <td className={`py-2 text-right ${view === 'share' ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                {formatMoney(r.myShare)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="mt-4 divide-y divide-slate-100 sm:hidden">
        {visible.map((r) => (
          <li key={r.id} className="py-3">
            <div className="flex items-baseline justify-between gap-3">
              <Link to={`/group/${r.groupId}`} className="min-w-0 truncate font-medium text-emerald-700">
                {r.description}
              </Link>
              <span className="shrink-0 font-semibold text-slate-900">{formatMoney(amountFor(r, view))}</span>
            </div>
            <p className="mt-0.5 text-xs text-slate-600">
              {formatDate(r.date)} · {r.groupName} · Paid by {r.paidByMe ? 'You' : r.paidByName}
            </p>
          </li>
        ))}
      </ul>

      {shown < rows.length && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setShown((n) => n + PAGE_SIZE)}
            className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Show more ({rows.length - shown} remaining)
          </button>
        </div>
      )}
    </>
  )
}

export default function Reports() {
  useDocumentTitle('Reports')
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const today = todayISO()

  // Reads are synchronous and the page is read-only, so reading on mount is enough.
  const groups = useMemo(() => getGroupsForUser(user.id), [user.id])
  const allRows = useMemo(
    () => collectRows(groups, user.id, getExpensesForGroup),
    [groups, user.id]
  )

  // --- Filter state, parsed from the URL (bad values fall back to defaults) ---
  const rangeParam = params.get('range')
  const range = RANGE_PRESETS.some((p) => p.key === rangeParam) ? rangeParam : DEFAULT_RANGE
  const groupParam = params.get('group') ?? ''
  const groupId = groups.some((g) => g.id === groupParam) ? groupParam : ''
  const view = params.get('view') === 'total' ? 'total' : 'share'

  let from
  let to
  if (range === 'custom') {
    const fromParam = params.get('from') ?? ''
    const toParam = params.get('to') ?? ''
    from = isValidISODate(fromParam) ? fromParam : null
    to = isValidISODate(toParam) ? toParam : null
  } else {
    ;({ from, to } = resolveRange(range, today))
  }

  const rangeError = from && to && from > to ? '"From" must be on or before "To".' : ''

  // On an invalid range keep showing the last valid results.
  const [lastValid, setLastValid] = useState(null)
  if (!rangeError && (lastValid?.from !== from || lastValid?.to !== to)) {
    setLastValid({ from, to })
  }
  const active = rangeError
    ? (lastValid ?? resolveRange(DEFAULT_RANGE, today))
    : { from, to }

  // A stale ?group= is dropped from the URL.
  useEffect(() => {
    if (groupParam && !groupId) {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete('group')
          return next
        },
        { replace: true }
      )
    }
  }, [groupParam, groupId, setParams])

  function update(changes) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value)
          else next.delete(key)
        }
        return next
      },
      { replace: true }
    )
  }

  function handleRangeChange(nextRange) {
    if (nextRange === 'custom') {
      // Seed the date inputs with the range currently shown.
      update({ range: 'custom', from: active.from ?? '', to: active.to ?? '' })
    } else {
      update({ range: nextRange === DEFAULT_RANGE ? '' : nextRange, from: '', to: '' })
    }
  }

  const filterKey = `${active.from}|${active.to}|${groupId}|${view}`
  const filtered = useMemo(
    () => filterRows(allRows, { from: active.from, to: active.to, groupId }),
    [allRows, active.from, active.to, groupId]
  )
  const report = useMemo(
    () => buildMonthlyReport(filtered, { from: active.from, to: active.to, view, today }),
    [filtered, active.from, active.to, view, today]
  )
  const tableRows = useMemo(() => sortRowsDescending(filtered), [filtered])

  function handleDownload() {
    const csv = buildCsv(
      REPORT_CSV_COLUMNS,
      toCsvRows(sortRowsAscending(filtered)),
      REPORT_CSV_RAW_COLUMNS
    )
    downloadCsv(reportFilename(todayISO()), csv)
  }

  const hasMatches = filtered.length > 0

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-600">Your expense history across all groups.</p>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={!hasMatches}
          className="min-h-11 shrink-0 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Download CSV
        </button>
      </div>

      {groups.length === 0 ? (
        <EmptyCard title="No groups yet">
          <p>Create a group to start tracking shared expenses.</p>
          <Link
            to="/group/new"
            className="mt-5 inline-block rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Create group
          </Link>
        </EmptyCard>
      ) : allRows.length === 0 ? (
        <EmptyCard title="No expenses yet">
          <p>Add an expense in one of your groups and it will show up here.</p>
          <Link
            to="/dashboard"
            className="mt-5 inline-block rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Go to dashboard
          </Link>
        </EmptyCard>
      ) : (
        <>
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5" aria-label="Filters">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="report-range" className="text-sm font-medium text-slate-700">Date range</label>
                <select
                  id="report-range"
                  value={range}
                  onChange={(e) => handleRangeChange(e.target.value)}
                  className={inputClass}
                >
                  {RANGE_PRESETS.map((p) => (
                    <option key={p.key} value={p.key}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="report-group" className="text-sm font-medium text-slate-700">Group</label>
                <select
                  id="report-group"
                  value={groupId}
                  onChange={(e) => update({ group: e.target.value })}
                  className={inputClass}
                >
                  <option value="">All groups</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <fieldset>
                <legend className="text-sm font-medium text-slate-700">Show</legend>
                <div className="mt-1 flex rounded-lg border border-slate-300 bg-white p-0.5">
                  {[
                    { value: 'share', label: 'My share' },
                    { value: 'total', label: 'Group total' },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className="flex min-h-10 flex-1 cursor-pointer items-center justify-center rounded-md px-3 text-sm font-medium text-slate-700 has-[:checked]:bg-emerald-700 has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-600"
                    >
                      <input
                        type="radio"
                        name="report-view"
                        value={opt.value}
                        checked={view === opt.value}
                        onChange={() => update({ view: opt.value === 'share' ? '' : opt.value })}
                        className="sr-only"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            {range === 'custom' && (
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="report-from" className="text-sm font-medium text-slate-700">From</label>
                  <input
                    id="report-from"
                    type="date"
                    value={from ?? ''}
                    max={to ?? undefined}
                    aria-invalid={rangeError ? 'true' : undefined}
                    aria-describedby={rangeError ? 'report-range-error' : undefined}
                    onChange={(e) => update({ range: 'custom', from: e.target.value, to: to ?? '' })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="report-to" className="text-sm font-medium text-slate-700">To</label>
                  <input
                    id="report-to"
                    type="date"
                    value={to ?? ''}
                    min={from ?? undefined}
                    aria-invalid={rangeError ? 'true' : undefined}
                    aria-describedby={rangeError ? 'report-range-error' : undefined}
                    onChange={(e) => update({ range: 'custom', from: from ?? '', to: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            {rangeError && (
              <div id="report-range-error" className="mt-4">
                <ErrorMessage>{rangeError}</ErrorMessage>
              </div>
            )}
          </section>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <SummaryCard label="Total spent" value={formatMoney(report.total)} />
            <SummaryCard label="Expenses" value={report.count} />
            <SummaryCard label="Average per month" value={formatMoney(report.averagePerMonth)} />
          </div>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Spending by month</h2>
            {!hasMatches && (
              <p className="mt-1 text-sm text-slate-600">
                No expenses in this period. Try a wider date range.
              </p>
            )}
            <MonthlyChart months={report.months} view={view} />
          </section>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Expenses</h2>
            {hasMatches ? (
              <ExpenseTable key={filterKey} rows={tableRows} view={view} />
            ) : (
              <p className="mt-2 text-sm text-slate-600">
                No expenses in this period. Try a wider date range.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  )
}
