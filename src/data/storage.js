// The only module in the app that talks to the database (Supabase).
//
// Callers use synchronous functions that return plain objects, so reads are
// served from an in-memory cache that loadData() fills from Supabase once a
// user is signed in. Writes update the cache straight away and are sent to
// Supabase in order through a queue. Row-level security on the server decides
// which rows each user can see, so the cache only ever holds the current
// user's groups, their members and those groups' expenses.

import { supabase } from '../lib/supabase.js'

const EMPTY = { users: [], groups: [], expenses: [], settlements: [] }
let cache = { ...EMPTY }
let loadedFor = null
let loading = null
// Bumped by clearData(); fetch results started under an older value are dropped.
let generation = 0

function newId() {
  return crypto.randomUUID()
}

export function normalizeEmail(email) {
  return email.trim().toLowerCase()
}

// ---------- loading ----------

function toUser(row) {
  return { id: row.id, name: row.name, email: row.email, createdAt: row.created_at }
}

function toMember(row) {
  return { id: row.id, email: row.email, userId: row.user_id, status: row.status }
}

function toGroup(row) {
  return {
    id: row.id,
    name: row.name,
    createdBy: row.created_by,
    createdAt: row.created_at,
    members: [...row.group_members]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map(toMember),
  }
}

function toExpense(row) {
  return {
    id: row.id,
    groupId: row.group_id,
    description: row.description,
    amount: row.amount_cents,
    date: row.date,
    paidBy: row.paid_by,
    shares: Object.fromEntries(row.expense_shares.map((s) => [s.member_id, s.amount_cents])),
    splitType: row.split_type,
    category: row.category,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    isDeleted: false,
  }
}

function check({ data, error }) {
  if (error) throw error
  return data
}

async function fetchProfiles() {
  return check(await supabase.from('profiles').select('*')).map(toUser)
}

function toSettlement(row) {
  return {
    id: row.id,
    groupId: row.group_id,
    from: row.from_member_id,
    to: row.to_member_id,
    amount: row.amount_cents,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }
}

async function fetchAll() {
  const [users, groups, expenses, settlements] = await Promise.all([
    fetchProfiles(),
    supabase.from('groups').select('*, group_members(*)').then(check),
    // Soft-deleted expenses are never loaded.
    supabase.from('expenses').select('*, expense_shares(*)').eq('is_deleted', false).then(check),
    supabase.from('settlements').select('*').then(check),
  ])
  return {
    users,
    groups: groups.map(toGroup),
    expenses: expenses.map(toExpense),
    settlements: settlements.map(toSettlement),
  }
}

// Loads the signed-in user's data into the cache. Call once after sign-in and
// wait for it before rendering anything that reads from storage. Calling it
// again for the same user is a no-op.
export function loadData(userId) {
  if (loadedFor === userId) return loading ?? Promise.resolve()
  loadedFor = userId
  const gen = generation
  const thisLoad = fetchAll()
    .then((data) => {
      if (gen === generation) cache = data
    })
    .catch((err) => {
      if (gen === generation) loadedFor = null
      throw err
    })
    .finally(() => {
      if (gen === generation) loading = null
    })
  loading = thisLoad
  return thisLoad
}

// Drops everything held in memory (on sign-out).
export function clearData() {
  generation++
  cache = { users: [], groups: [], expenses: [], settlements: [] }
  loadedFor = null
  loading = null
}

// Kept so existing callers (main.jsx) don't change; there is nothing to seed
// client-side any more.
export function initStorage() {}

// ---------- write queue ----------
// Writes run one at a time, in the order they were made (an expense has to
// exist before it can be soft-deleted). If one fails, the cache is reloaded
// from the server once the queue is empty so it stops showing unsaved data.

let queue = Promise.resolve()
let pending = 0
let needsResync = false

// Returns a promise that resolves to { ok: true } or { error } once the write
// has finished (and, after a failure, once the cache resync has run). It never
// rejects, so callers that ignore it are unaffected.
function enqueue(task) {
  pending++
  const gen = generation
  let failed = false
  queue = queue
    .then(task)
    .catch((err) => {
      console.error('Saving to Supabase failed:', err?.code ?? '', err?.message ?? '')
      failed = true
      needsResync = true
    })
    .then(async () => {
      pending--
      if (needsResync && pending === 0) {
        needsResync = false
        try {
          const data = await fetchAll()
          // Discard the result if the user signed out while it was loading.
          if (gen === generation) cache = data
        } catch (err) {
          console.error('Reloading from Supabase failed:', err?.code ?? '', err?.message ?? '')
        }
      }
    })
  return queue.then(() =>
    failed ? { error: 'Could not save your changes. Please try again.' } : { ok: true },
  )
}

// ---------- users ----------
// Accounts live in Supabase Auth; a profile row is created for each one. Only
// profiles of people who share a group with you are visible.

export function getUserById(id) {
  return cache.users.find((u) => u.id === id) ?? null
}

export function getUserByEmail(email) {
  const normalized = normalizeEmail(email)
  return cache.users.find((u) => u.email === normalized) ?? null
}

// ---------- groups ----------

// Adds a display name to each member: the user's name if registered,
// otherwise the email address.
function hydrateGroup(group) {
  return {
    ...group,
    members: group.members.map((m) => {
      const user = m.userId ? cache.users.find((u) => u.id === m.userId) : null
      return { ...m, name: user?.name ?? m.email }
    }),
  }
}

// Members of both statuses ('active' and 'pending') are included.
export function getGroupsForUser(userId) {
  return cache.groups
    .filter((g) => g.members.some((m) => m.userId === userId && m.status === 'active'))
    .map(hydrateGroup)
}

export function getGroup(groupId) {
  const group = cache.groups.find((g) => g.id === groupId)
  return group ? hydrateGroup(group) : null
}

// After the server has had a chance to link members who already have an
// account, pull the real member rows and profiles for this group.
async function refreshGroupMembers(groupId) {
  const [rows, users] = await Promise.all([
    supabase.from('group_members').select('*').eq('group_id', groupId).then(check),
    fetchProfiles(),
  ])
  const group = cache.groups.find((g) => g.id === groupId)
  if (group) {
    group.members = rows
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map(toMember)
  }
  cache.users = users
}

// memberEmails should not include the creator; the creator is always added.
export function createGroup({ name, creatorId, memberEmails }) {
  const creator = getUserById(creatorId)
  if (!creator) throw new Error('Creator not found')

  const members = [
    { id: newId(), email: creator.email, userId: creator.id, status: 'active' },
  ]
  const seen = new Set([creator.email])
  for (const rawEmail of memberEmails) {
    const email = normalizeEmail(rawEmail)
    if (seen.has(email)) continue
    seen.add(email)
    // Someone we can't see yet is shown as pending; the server links them
    // if they already have an account.
    const user = getUserByEmail(email)
    members.push({
      id: newId(),
      email,
      userId: user?.id ?? null,
      status: user ? 'active' : 'pending',
    })
  }

  const group = {
    id: newId(),
    name: name.trim(),
    createdBy: creator.id,
    createdAt: new Date().toISOString(),
    members,
  }
  cache.groups.push(group)

  enqueue(async () => {
    check(
      await supabase
        .from('groups')
        .insert({ id: group.id, name: group.name, created_by: group.createdBy }),
    )
    // Distinct timestamps keep the members in the order they were added.
    const base = Date.now()
    check(
      await supabase.from('group_members').insert(
        group.members.map((m, i) => ({
          id: m.id,
          group_id: group.id,
          email: m.email,
          user_id: m.userId,
          status: m.status,
          created_at: new Date(base + i).toISOString(),
        })),
      ),
    )
    await refreshGroupMembers(group.id)
  })

  return hydrateGroup(group)
}

// ---------- expenses ----------
// Amounts are stored as integer cents. paidBy and the keys of shares are
// group member ids (not user ids), so pending members can take part too.
// splitType is 'equal' or 'exact'; category is a free string.
// notes is an optional free-text string ('' when empty).

// Soft-deleted expenses are never returned.
export function getExpensesForGroup(groupId) {
  return cache.expenses.filter((e) => e.groupId === groupId)
}

export function addExpense({
  groupId,
  description,
  amount,
  date,
  paidBy,
  shares,
  splitType = 'equal',
  category = 'Other',
  notes = '',
  createdBy,
}) {
  // Balances only work if every expense adds up, so refuse ones that don't.
  const shareTotal = Object.values(shares).reduce((sum, cents) => sum + cents, 0)
  if (shareTotal !== amount) {
    throw new Error(`Shares add up to ${shareTotal} but the expense total is ${amount}`)
  }
  const expense = {
    id: newId(),
    groupId,
    description: description.trim(),
    amount,
    date,
    paidBy,
    shares,
    splitType,
    category,
    notes: notes.trim(),
    createdBy,
    createdAt: new Date().toISOString(),
    isDeleted: false,
  }
  cache.expenses.push(expense)

  // The expense and its shares are saved in one database call so the
  // shares-add-up check runs on the complete expense.
  enqueue(async () => {
    check(
      await supabase.rpc('add_expense', {
        p_id: expense.id,
        p_group_id: expense.groupId,
        p_description: expense.description,
        p_amount_cents: expense.amount,
        p_date: expense.date,
        p_paid_by: expense.paidBy,
        p_shares: expense.shares,
        p_split_type: expense.splitType,
        p_category: expense.category,
        p_notes: expense.notes,
      }),
    )
  })
  return expense
}

// Soft delete: the row is kept in the database and flagged, never removed.
export function softDeleteExpense(expenseId, deletedBy) {
  const index = cache.expenses.findIndex((e) => e.id === expenseId)
  if (index === -1) return
  cache.expenses.splice(index, 1)

  enqueue(async () => {
    check(
      await supabase
        .from('expenses')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: deletedBy,
        })
        .eq('id', expenseId),
    )
  })
}

// ---------- settlements ----------
// A settlement is a recorded payment of `amount` cents (integer) from member
// `from` (the debtor) to member `to` (the creditor), both group member ids.
// Append-only: never edited or deleted. balances.js applies them as transfers
// that reduce the debt between exactly that pair.

export function getSettlementsForGroup(groupId) {
  return cache.settlements.filter((s) => s.groupId === groupId)
}

export function addSettlement({ groupId, from, to, amount, createdBy }) {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error('Amount must be positive')
  if (from === to) throw new Error('Cannot settle with yourself')
  const settlement = {
    id: newId(),
    groupId,
    from,
    to,
    amount,
    createdBy,
    createdAt: new Date().toISOString(),
  }
  cache.settlements.push(settlement)

  // Resolves to { ok: true } or { error } after the write (and any resync).
  return enqueue(async () => {
    check(
      await supabase.from('settlements').insert({
        id: settlement.id,
        group_id: groupId,
        from_member_id: from,
        to_member_id: to,
        amount_cents: amount,
        created_by: createdBy,
      }),
    )
  })
}

// ---------- group settings (admin = group creator) ----------
// Server-side RLS also limits these to the creator: groups_update and
// group_members_delete both require groups.created_by = auth.uid().

export function isGroupAdmin(groupId, userId) {
  const group = cache.groups.find((g) => g.id === groupId)
  return !!group && !!userId && group.createdBy === userId
}

export const MEMBER_HAS_EXPENSES_ERROR = 'Cannot remove — member has existing expenses.'

// Trimmed name must be non-empty. Updates the cache now, saves in the background.
export function renameGroup(groupId, name) {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Please give the group a name.')
  const group = cache.groups.find((g) => g.id === groupId)
  if (!group) throw new Error('Group not found')
  group.name = trimmed
  enqueue(async () => {
    check(await supabase.from('groups').update({ name: trimmed }).eq('id', groupId))
  })
  return hydrateGroup(group)
}

// Removes a member only if they have no expenses at all in the group (paid or
// shared), counting soft-deleted ones, which the cache does not hold, so the
// check asks Supabase. Resolves to { error } or { ok: true }.
export async function removeGroupMember(groupId, memberId, currentUserId) {
  const group = cache.groups.find((g) => g.id === groupId)
  if (!group) return { error: 'Group not found' }
  if (group.createdBy !== currentUserId) return { error: 'Only the group admin can remove members.' }
  const member = group.members.find((m) => m.id === memberId)
  if (!member) return { error: 'Member not found' }
  if (member.userId === currentUserId) return { error: 'You cannot remove yourself.' }

  try {
    // Let queued writes (e.g. a just-added expense) reach the server first.
    await queue
    const [paid, shared] = await Promise.all([
      supabase.from('expenses').select('id').eq('group_id', groupId).eq('paid_by', memberId).limit(1),
      supabase.from('expense_shares').select('expense_id').eq('member_id', memberId).limit(1),
    ])
    if (paid.error) throw paid.error
    if (shared.error) throw shared.error
    if (paid.data.length > 0 || shared.data.length > 0) return { error: MEMBER_HAS_EXPENSES_ERROR }

    const { data, error } = await supabase
      .from('group_members')
      .delete()
      .eq('id', memberId)
      .eq('group_id', groupId)
      .select('id')
    if (error) {
      // A foreign-key violation means an expense references them after all.
      return { error: error.code === '23503' ? MEMBER_HAS_EXPENSES_ERROR : error.message }
    }
    if (data.length === 0) return { error: 'Could not remove member.' }
    group.members = group.members.filter((m) => m.id !== memberId)
    return { ok: true }
  } catch (err) {
    return { error: err.message ?? 'Could not remove member.' }
  }
}
