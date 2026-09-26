import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import useUserGroups from '../hooks/useUserGroups.js'
import BalanceLabel from '../components/BalanceLabel.jsx'
import { formatMoney } from '../utils/money.js'

function SummaryCard({ label, value, tone }) {
  const colors = {
    green: 'text-emerald-600',
    red: 'text-red-600',
    gray: 'text-slate-900',
  }
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${colors[tone]}`}>{value}</p>
    </div>
  )
}

function netDisplay(net) {
  if (net > 0) return { value: `+${formatMoney(net)}`, tone: 'green' }
  if (net < 0) return { value: `-${formatMoney(-net)}`, tone: 'red' }
  return { value: formatMoney(0), tone: 'gray' }
}

export default function Dashboard() {
  const { user } = useAuth()
  const { groups, owedToMe, iOwe, net } = useUserGroups(user.id)

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hi, {user.name}</h1>
          <p className="text-sm text-slate-500">Here's where you stand across your groups.</p>
        </div>
        {groups.length > 0 && (
          <Link
            to="/group/new"
            className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Create group
          </Link>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Owed to you" value={formatMoney(owedToMe)} tone={owedToMe ? 'green' : 'gray'} />
        <SummaryCard label="You owe" value={formatMoney(iOwe)} tone={iOwe ? 'red' : 'gray'} />
        <SummaryCard label="Net balance" {...netDisplay(net)} />
      </div>

      <h2 className="mt-10 text-lg font-semibold text-slate-900">Your groups</h2>

      {groups.length === 0 ? (
        <div className="mt-4 rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-12 text-center">
          <p className="font-medium text-slate-900">You're not in any groups yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Create a group to start tracking shared expenses with friends.
          </p>
          <Link
            to="/group/new"
            className="mt-5 inline-block rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Create group
          </Link>
        </div>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {groups.map((group) => (
            <li key={group.id}>
              <Link
                to={`/group/${group.id}`}
                className="block rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-emerald-300 hover:shadow-sm"
              >
                <p className="font-semibold text-slate-900">{group.name}</p>
                <p className="mt-0.5 text-sm text-slate-500">
                  {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
                </p>
                <BalanceLabel cents={group.myBalance} className="mt-3 block text-sm" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
