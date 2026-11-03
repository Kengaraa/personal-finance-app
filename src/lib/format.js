export function money(value, currency = 'USD', options = {}) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      ...options,
    }).format(Number(value) || 0)
  } catch {
    return `${currency} ${(Number(value) || 0).toFixed(2)}`
  }
}

export function compactMoney(value, currency = 'USD') {
  return money(value, currency, { notation: 'compact', maximumFractionDigits: 1 })
}

export function toISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseISO(iso) {
  return new Date(`${iso}T00:00:00`)
}

export function monthRange(date) {
  return {
    start: toISO(new Date(date.getFullYear(), date.getMonth(), 1)),
    end: toISO(new Date(date.getFullYear(), date.getMonth() + 1, 0)),
  }
}

export function formatDate(iso, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!iso) return ''
  return parseISO(iso).toLocaleDateString(undefined, options)
}

export function monthLabel(date, options = { month: 'long', year: 'numeric' }) {
  return date.toLocaleDateString(undefined, options)
}

export function percent(value, digits = 0) {
  return `${(Number(value) || 0).toFixed(digits)}%`
}

export function daysUntil(iso) {
  if (!iso) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((parseISO(iso) - today) / 86400000)
}
