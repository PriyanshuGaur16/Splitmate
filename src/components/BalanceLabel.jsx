import { formatMoney } from '../utils/money.js'

// "You're owed $1,800" / "You owe $800" / "All settled"
export default function BalanceLabel({ cents, className = '' }) {
  if (cents > 0) {
    return <span className={`font-medium text-emerald-600 ${className}`}>You're owed {formatMoney(cents)}</span>
  }
  if (cents < 0) {
    return <span className={`font-medium text-red-600 ${className}`}>You owe {formatMoney(-cents)}</span>
  }
  return <span className={`text-slate-400 ${className}`}>All settled</span>
}
