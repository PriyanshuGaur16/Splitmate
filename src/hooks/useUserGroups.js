import { useMemo } from 'react'
import * as storage from '../data/storage.js'
import { computeNetBalances } from '../utils/balances.js'

// All groups the user is an active member of, each with the user's net
// balance in that group (positive = owed to them, negative = they owe).
export default function useUserGroups(userId) {
  return useMemo(() => {
    const groups = storage.getGroupsForUser(userId).map((group) => {
      const me = group.members.find((m) => m.userId === userId)
      const net = computeNetBalances(group.members, storage.getExpensesForGroup(group.id))
      return { ...group, myBalance: net[me.id] ?? 0 }
    })
    groups.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    const owedToMe = groups.reduce((sum, g) => sum + Math.max(g.myBalance, 0), 0)
    const iOwe = groups.reduce((sum, g) => sum + Math.max(-g.myBalance, 0), 0)
    return { groups, owedToMe, iOwe, net: owedToMe - iOwe }
  }, [userId])
}
