import { getGroup, getExpensesForGroup } from '../data/storage'
import { centsToInput } from './money'
import { buildCsv, downloadCsv } from './csvExport'

// Column headers, in output order.
export const GROUP_EXPORT_COLUMNS = [
  'Date',
  'Description',
  'Category',
  'Amount',
  'Paid By',
  'Split Between',
  'Notes',
]

// Returns an array of row objects keyed by GROUP_EXPORT_COLUMNS (insertion
// order matches the column order), sorted by date ascending. All values are
// strings. Soft-deleted expenses are excluded. Returns [] for an unknown group.
export function exportGroupHistory(groupId) {
  const group = getGroup(groupId)
  if (!group) return []

  const nameOf = (memberId) =>
    group.members.find((m) => m.id === memberId)?.name ?? 'Unknown'

  return getExpensesForGroup(groupId)
    .filter((e) => !e.isDeleted)
    .map((e, i) => ({ e, i }))
    .sort((a, b) => {
      const da = String(a.e.date ?? '')
      const db = String(b.e.date ?? '')
      return da < db ? -1 : da > db ? 1 : a.i - b.i // stable
    })
    .map(({ e }) => ({
      Date: e.date ?? '',
      Description: e.description ?? '',
      Category: e.category ?? '',
      Amount: centsToInput(e.amount),
      'Paid By': nameOf(e.paidBy),
      'Split Between': Object.keys(e.shares ?? {}).map(nameOf).join('; '),
      Notes: e.notes ?? '',
    }))
}

function slugify(name) {
  const slug = String(name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'group'
}

// Builds a CSV of the group's expense history and triggers a browser download.
export function downloadGroupHistory(groupId, groupName) {
  const csv = buildCsv(GROUP_EXPORT_COLUMNS, exportGroupHistory(groupId), ['Amount'])
  downloadCsv(`splitmate-${slugify(groupName)}-history.csv`, csv)
}
