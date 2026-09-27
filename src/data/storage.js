// The only module in the app that reads or writes localStorage.
// Every function here is synchronous and returns plain objects, so swapping
// this file for Supabase calls later only changes this file's internals
// (and makes the functions async).

const KEYS = {
  users: 'splitmate.users',
  groups: 'splitmate.groups',
  expenses: 'splitmate.expenses',
  session: 'splitmate.session',
}

const SEED_USERS = [
  { name: 'Priyanshu', email: 'priyanshu@test.com', password: 'password' },
  { name: 'Anshul', email: 'anshul@test.com', password: 'password' },
  { name: 'Aditya', email: 'aditya@test.com', password: 'password' },
  { name: 'Hrishi', email: 'hrishi@test.com', password: 'password' },
]

// ---------- low-level helpers ----------

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function newId() {
  return crypto.randomUUID()
}

export function normalizeEmail(email) {
  return email.trim().toLowerCase()
}

// ---------- setup ----------

// Creates the test accounts if they don't exist yet. Safe to call repeatedly.
export function initStorage() {
  const users = read(KEYS.users, [])
  let changed = false
  for (const seed of SEED_USERS) {
    if (!users.some((u) => u.email === seed.email)) {
      users.push({ id: newId(), ...seed, createdAt: new Date().toISOString() })
      changed = true
    }
  }
  if (changed) write(KEYS.users, users)
}

// ---------- users ----------

export function getUserById(id) {
  return read(KEYS.users, []).find((u) => u.id === id) ?? null
}

export function getUserByEmail(email) {
  const normalized = normalizeEmail(email)
  return read(KEYS.users, []).find((u) => u.email === normalized) ?? null
}

export function createUser({ name, email, password }) {
  const users = read(KEYS.users, [])
  const user = {
    id: newId(),
    name: name.trim(),
    email: normalizeEmail(email),
    password,
    createdAt: new Date().toISOString(),
  }
  users.push(user)
  write(KEYS.users, users)
  activatePendingMemberships(user)
  return user
}

// Turns every pending membership for this email into an active one.
function activatePendingMemberships(user) {
  const groups = read(KEYS.groups, [])
  let changed = false
  for (const group of groups) {
    for (const member of group.members) {
      if (member.status === 'pending' && member.email === user.email) {
        member.status = 'active'
        member.userId = user.id
        changed = true
      }
    }
  }
  if (changed) write(KEYS.groups, groups)
}

// ---------- session ----------

export function getSessionUserId() {
  return read(KEYS.session, null)?.userId ?? null
}

export function setSessionUserId(userId) {
  write(KEYS.session, { userId })
}

export function clearSession() {
  localStorage.removeItem(KEYS.session)
}

// ---------- groups ----------

// Adds a display name to each member: the user's name if registered,
// otherwise the email address.
function hydrateGroup(group) {
  const users = read(KEYS.users, [])
  return {
    ...group,
    members: group.members.map((m) => {
      const user = m.userId ? users.find((u) => u.id === m.userId) : null
      return { ...m, name: user?.name ?? m.email }
    }),
  }
}

export function getGroupsForUser(userId) {
  return read(KEYS.groups, [])
    .filter((g) => g.members.some((m) => m.userId === userId && m.status === 'active'))
    .map(hydrateGroup)
}

export function getGroup(groupId) {
  const group = read(KEYS.groups, []).find((g) => g.id === groupId)
  return group ? hydrateGroup(group) : null
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
  const groups = read(KEYS.groups, [])
  groups.push(group)
  write(KEYS.groups, groups)
  return hydrateGroup(group)
}

// ---------- expenses ----------
// Amounts are stored as integer cents. paidBy and the keys of shares are
// group member ids (not user ids), so pending members can take part too.
// splitType is 'equal' or 'exact'; expenses saved before it existed are equal.
// category is a free string; expenses saved before it existed have none.

export function getExpensesForGroup(groupId, { includeDeleted = false } = {}) {
  return read(KEYS.expenses, []).filter(
    (e) => e.groupId === groupId && (includeDeleted || !e.isDeleted),
  )
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
    createdBy,
    createdAt: new Date().toISOString(),
    isDeleted: false,
  }
  const expenses = read(KEYS.expenses, [])
  expenses.push(expense)
  write(KEYS.expenses, expenses)
  return expense
}

// Soft delete: the record is kept and flagged, never removed.
export function softDeleteExpense(expenseId, deletedBy) {
  const expenses = read(KEYS.expenses, [])
  const expense = expenses.find((e) => e.id === expenseId)
  if (!expense) return
  expense.isDeleted = true
  expense.deletedAt = new Date().toISOString()
  expense.deletedBy = deletedBy
  write(KEYS.expenses, expenses)
}
