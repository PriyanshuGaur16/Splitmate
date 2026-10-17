// Pure aggregation for the Reports page. No storage or React imports: callers
// pass in groups and a getExpenses(groupId) reader. All money is integer cents.
// Dates are ISO "YYYY-MM-DD" strings, compared as strings (never via Date).

import { centsToInput } from './money'

export const RANGE_PRESETS = [
  { key: 'this-month', label: 'This month' },
  { key: 'last-3', label: 'Last 3 months' },
  { key: 'last-6', label: 'Last 6 months' },
  { key: 'this-year', label: 'This year' },
  { key: 'all', label: 'All time' },
  { key: 'custom', label: 'Custom' },
]
export const DEFAULT_RANGE = 'last-6'

export const REPORT_CSV_COLUMNS = [
  'Date',
  'Group',
  'Description',
  'Category',
  'Paid By',
  'Total',
  'My Share',
  'Split Between',
  'Notes',
]
// Amount columns come from integer cents, so they skip formula neutralising.
export const REPORT_CSV_RAW_COLUMNS = ['Total', 'My Share']

// True for a real calendar date written as YYYY-MM-DD.
export function isValidISODate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}

// Turns a preset into { from, to } (inclusive ISO dates, null = unbounded).
// "Last N months" means the current month plus the N-1 before it.
export function resolveRange(preset, today) {
  const y = Number(today.slice(0, 4))
  const m = Number(today.slice(5, 7))
  const pad = (n) => String(n).padStart(2, '0')

  if (preset === 'all') return { from: null, to: null }
  if (preset === 'this-year') return { from: `${y}-01-01`, to: today }
  if (preset === 'last-3' || preset === 'last-6') {
    const months = preset === 'last-3' ? 3 : 6
    const index = y * 12 + (m - 1) - (months - 1)
    return { from: `${Math.floor(index / 12)}-${pad((index % 12) + 1)}-01`, to: today }
  }
  return { from: `${today.slice(0, 7)}-01`, to: today } // this-month
}

// One flat row per expense across the user's groups. Groups where the user has
// no member record are skipped. `groups` are hydrated (members carry names).
export function collectRows(groups, userId, getExpenses) {
  const rows = []
  for (const group of groups) {
    const me = group.members.find((m) => m.userId === userId)
    if (!me) continue
    const nameOf = (memberId) => group.members.find((m) => m.id === memberId)?.name ?? 'Unknown'

    for (const e of getExpenses(group.id)) {
      if (e.isDeleted) continue
      const shares = e.shares ?? {}
      rows.push({
        id: e.id,
        groupId: group.id,
        groupName: group.name,
        date: e.date ?? '',
        description: e.description ?? '',
        category: e.category ?? '',
        notes: e.notes ?? '',
        createdAt: e.createdAt ?? '',
        paidByName: nameOf(e.paidBy),
        paidByMe: e.paidBy === me.id,
        total: e.amount,
        myShare: shares[me.id] ?? 0,
        splitBetween: Object.keys(shares)
          .filter((id) => shares[id] > 0)
          .map(nameOf),
      })
    }
  }
  return rows
}

// Keeps rows inside the inclusive date range and (optionally) one group.
export function filterRows(rows, { from, to, groupId }) {
  return rows.filter(
    (r) =>
      (!groupId || r.groupId === groupId) &&
      (!from || r.date >= from) &&
      (!to || r.date <= to)
  )
}

function byDateThenCreated(a, b) {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1
  return 0
}

// Oldest first (CSV order). Array.sort is stable, so equal rows keep read order.
export function sortRowsAscending(rows) {
  return [...rows].sort(byDateThenCreated)
}

// Newest first (on-screen order).
export function sortRowsDescending(rows) {
  return [...rows].sort((a, b) => byDateThenCreated(b, a))
}

// The figure a row contributes in the active mode.
export function amountFor(row, view) {
  return view === 'total' ? row.total : row.myShare
}

// Inclusive list of "YYYY-MM" keys from startKey to endKey.
export function monthKeys(startKey, endKey) {
  const keys = []
  let y = Number(startKey.slice(0, 4))
  let m = Number(startKey.slice(5, 7))
  const endY = Number(endKey.slice(0, 4))
  const endM = Number(endKey.slice(5, 7))
  while (y < endY || (y === endY && m <= endM)) {
    keys.push(`${y}-${String(m).padStart(2, '0')}`)
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }
  return keys
}

// "2026-01" -> "Jan 2026" (or "Jan" when withYear is false). Built from the key
// directly so there is no timezone drift.
export function monthLabel(key, withYear = true) {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const name = names[Number(key.slice(5, 7)) - 1]
  return withYear ? `${name} ${key.slice(0, 4)}` : name
}

// Summary + monthly buckets for already-filtered rows.
// The month axis runs from the range start (or earliest row) to the range end
// (or the later of the current month and the latest row), zero months included.
export function buildMonthlyReport(rows, { from, to, view, today }) {
  const rowKeys = rows.map((r) => r.date.slice(0, 7)).sort()
  const currentKey = today.slice(0, 7)

  const startKey = from ? from.slice(0, 7) : (rowKeys[0] ?? currentKey)
  let endKey = to ? to.slice(0, 7) : currentKey
  if (!to && rowKeys.length > 0 && rowKeys[rowKeys.length - 1] > endKey) {
    endKey = rowKeys[rowKeys.length - 1]
  }

  const months = monthKeys(startKey, endKey).map((key) => ({ key, total: 0, count: 0 }))
  const byKey = Object.fromEntries(months.map((m) => [m.key, m]))

  let total = 0
  for (const row of rows) {
    const bucket = byKey[row.date.slice(0, 7)]
    if (!bucket) continue
    const amount = amountFor(row, view)
    bucket.total += amount
    bucket.count += 1
    total += amount
  }

  return {
    months,
    total,
    count: rows.length,
    averagePerMonth: months.length ? Math.round(total / months.length) : 0,
  }
}

// Row objects keyed by REPORT_CSV_COLUMNS, in the order given. Always includes
// both Total and My Share, whatever the on-screen mode is.
export function toCsvRows(rows) {
  return rows.map((r) => ({
    Date: r.date,
    Group: r.groupName,
    Description: r.description,
    Category: r.category,
    'Paid By': r.paidByName,
    Total: centsToInput(r.total),
    'My Share': centsToInput(r.myShare),
    'Split Between': r.splitBetween.join('; '),
    Notes: r.notes,
  }))
}

// "splitmate-report-YYYY-MM.csv" for the month of `today`.
export function reportFilename(today) {
  return `splitmate-report-${today.slice(0, 7)}.csv`
}
