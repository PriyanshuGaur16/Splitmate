// All amounts in the app are integer cents to avoid floating-point drift.

const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export function formatMoney(cents) {
  const dollars = cents / 100
  // Show "$1,800" for whole amounts and "$12.50" otherwise.
  if (Number.isInteger(dollars)) return formatter.format(dollars)
  return formatter.format(dollars).replace(/\.(\d)$/, '.$10')
}

// Parses user input like "12.5" into cents. Returns null if invalid.
export function parseToCents(input) {
  const trimmed = String(input).trim()
  if (!/^\d+(\.\d{0,2})?$/.test(trimmed)) return null
  return Math.round(parseFloat(trimmed) * 100)
}

// Splits cents as evenly as possible. Leftover cents go to the first people,
// so the shares always add up exactly to the total.
export function splitEqually(totalCents, memberIds) {
  const shares = {}
  if (memberIds.length === 0) return shares
  const base = Math.floor(totalCents / memberIds.length)
  const remainder = totalCents - base * memberIds.length
  memberIds.forEach((id, i) => {
    shares[id] = base + (i < remainder ? 1 : 0)
  })
  return shares
}

// Formats cents for a text input, e.g. 1250 -> "12.50".
export function centsToInput(cents) {
  return (cents / 100).toFixed(2)
}

// Adds up a { memberId: cents } object.
export function sumCents(shares) {
  return Object.values(shares).reduce((sum, cents) => sum + cents, 0)
}
