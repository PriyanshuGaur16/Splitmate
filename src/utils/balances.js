// Net balance per member: positive means they are owed money,
// negative means they owe. Deleted expenses are always ignored.
//
// `payments` are recorded settle-ups ({ from, to, amount }): `from` handed
// `amount` cents to `to`, so from's position goes up and to's goes down.
export function computeNetBalances(members, expenses, payments = []) {
  const net = Object.fromEntries(members.map((m) => [m.id, 0]))
  for (const expense of expenses) {
    if (expense.isDeleted) continue
    net[expense.paidBy] = (net[expense.paidBy] ?? 0) + expense.amount
    for (const [memberId, share] of Object.entries(expense.shares)) {
      net[memberId] = (net[memberId] ?? 0) - share
    }
  }
  for (const p of payments) {
    net[p.from] = (net[p.from] ?? 0) + p.amount
    net[p.to] = (net[p.to] ?? 0) - p.amount
  }
  return net
}

// Who owes whom, worked out directly from the expenses: whoever shares an
// expense owes the person who paid it. Debts between the same two people are
// netted against each other, so "A paid dinner, B paid the cab" collapses to
// a single payment.
//
// Debts are deliberately NOT re-routed through third parties. Matching
// overall balances instead ("minimise the number of transfers") can make a
// new expense change what two uninvolved people owe each other, e.g. Hrishi's
// debt to you going up because Aditya paid for the turf. Every payment listed
// here traces back to expenses those two people actually shared.
//
// Recorded settle-ups (`payments`) only reduce the debt between exactly the
// two members involved; nobody else's balances are touched.
export function computeSettlements(members, expenses, payments = []) {
  const owes = {} // owes[from][to] = cents `from` owes `to`
  for (const expense of expenses) {
    if (expense.isDeleted) continue
    for (const [memberId, share] of Object.entries(expense.shares)) {
      if (memberId === expense.paidBy || share === 0) continue
      owes[memberId] ??= {}
      owes[memberId][expense.paidBy] = (owes[memberId][expense.paidBy] ?? 0) + share
    }
  }
  for (const p of payments) {
    owes[p.from] ??= {}
    owes[p.from][p.to] = (owes[p.from][p.to] ?? 0) - p.amount
  }

  const settlements = []
  const ids = members.map((m) => m.id)
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i]
      const b = ids[j]
      const diff = (owes[a]?.[b] ?? 0) - (owes[b]?.[a] ?? 0)
      if (diff > 0) settlements.push({ from: a, to: b, amount: diff })
      else if (diff < 0) settlements.push({ from: b, to: a, amount: -diff })
    }
  }
  return settlements
}
