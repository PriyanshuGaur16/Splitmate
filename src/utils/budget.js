import { parseToCents } from './money.js'

// Parses the budget text field. Blank means "no budget" (null cents).
// Returns { cents } or { error }.
export function parseBudgetInput(input) {
  if (!input.trim()) return { cents: null }
  const cents = parseToCents(input)
  if (cents === null) return { error: 'Enter a budget like 20000 or 1500.50.' }
  if (cents <= 0) return { error: 'Budget must be greater than 0.' }
  return { cents }
}

// Total spent by the whole group. `expenses` must already exclude deleted ones
// (getExpensesForGroup does). Settlements are payments, not spending.
export function totalSpent(expenses) {
  return expenses.reduce((sum, e) => sum + e.amount, 0)
}

// Returns null when the group has no budget.
export function budgetStatus(budgetCents, spentCents) {
  if (!budgetCents) return null
  const over = spentCents - budgetCents
  return {
    spent: spentCents,
    budget: budgetCents,
    // The bar never exceeds 100%.
    percent: Math.min(100, Math.round((spentCents / budgetCents) * 100)),
    isOver: over > 0,
    overBy: Math.max(over, 0),
    remaining: Math.max(-over, 0),
  }
}
