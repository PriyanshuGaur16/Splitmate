import { formatMoney } from '../utils/money.js'

// "Spent $X of $Y" with a thin flat bar. `status` comes from budgetStatus().
// Over budget is shown in text as well as colour.
export default function BudgetBar({ status, compact = false }) {
  if (!status) return null
  const { spent, budget, percent, isOver, overBy } = status
  return (
    <div>
      <p className={`font-ledger ${compact ? 'text-xs' : 'text-sm'} text-ink-soft`}>
        Spent <span className="text-ink">{formatMoney(spent)}</span> of {formatMoney(budget)}
        {isOver && <span className="font-semibold text-red-700"> · Over budget by {formatMoney(overBy)}</span>}
      </p>
      <div
        role="progressbar"
        aria-label="Budget used"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="mt-1.5 h-1.5 w-full bg-rule"
      >
        <div className={`h-full ${isOver ? 'bg-red-700' : 'bg-stamp'}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
