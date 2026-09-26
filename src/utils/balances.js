// Net balance per member: positive means they are owed money,
// negative means they owe. Deleted expenses are always ignored.
export function computeNetBalances(members, expenses) {
  const net = Object.fromEntries(members.map((m) => [m.id, 0]))
  for (const expense of expenses) {
    if (expense.isDeleted) continue
    net[expense.paidBy] = (net[expense.paidBy] ?? 0) + expense.amount
    for (const [memberId, share] of Object.entries(expense.shares)) {
      net[memberId] = (net[memberId] ?? 0) - share
    }
  }
  return net
}

// Turns net balances into a short list of payments that settles everyone.
// Greedy: repeatedly match the biggest debtor with the biggest creditor.
// Each step fully settles at least one person, so there are at most n - 1
// payments. It usually finds the fewest payments but does not guarantee it.
export function simplifyDebts(net) {
  const creditors = []
  const debtors = []
  for (const [id, amount] of Object.entries(net)) {
    if (amount > 0) creditors.push({ id, amount })
    else if (amount < 0) debtors.push({ id, amount: -amount })
  }

  const settlements = []
  while (creditors.length && debtors.length) {
    creditors.sort((a, b) => b.amount - a.amount)
    debtors.sort((a, b) => b.amount - a.amount)
    const creditor = creditors[0]
    const debtor = debtors[0]
    const amount = Math.min(creditor.amount, debtor.amount)

    settlements.push({ from: debtor.id, to: creditor.id, amount })
    creditor.amount -= amount
    debtor.amount -= amount
    if (creditor.amount === 0) creditors.shift()
    if (debtor.amount === 0) debtors.shift()
  }
  return settlements
}

export function computeSettlements(members, expenses) {
  return simplifyDebts(computeNetBalances(members, expenses))
}
