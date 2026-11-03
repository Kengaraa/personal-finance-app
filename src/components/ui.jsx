import { Loader2 } from 'lucide-react'
import { CATEGORY_ICONS } from '../lib/icons'

export function Spinner({ className = 'h-5 w-5' }) {
  return <Loader2 className={`animate-spin text-brand-600 ${className}`} aria-label="Loading" />
}

export function FullPageSpinner() {
  return (
    <div className="grid min-h-screen place-items-center">
      <Spinner className="h-8 w-8" />
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="grid min-h-[40vh] place-items-center">
      <Spinner className="h-7 w-7" />
    </div>
  )
}

export function PageHeader({ title, description, children }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {Icon && (
        <span className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
      )}
      <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ProgressBar({ value, max, color, className = '' }) {
  const ratio = max > 0 ? value / max : 0
  const pct = Math.max(0, Math.min(100, ratio * 100))
  const auto = ratio >= 1 ? '#e11d48' : ratio >= 0.8 ? '#d97706' : '#0d9488'
  return (
    <div
      className={`h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 ${className}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color || auto }} />
    </div>
  )
}

export function CategoryIcon({ category, size = 'md' }) {
  const Icon = CATEGORY_ICONS[category?.icon] || CATEGORY_ICONS.tag
  const color = category?.color || '#64748b'
  const box = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10'
  const icon = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
  return (
    <span className={`${box} grid shrink-0 place-items-center rounded-full`} style={{ backgroundColor: `${color}22`, color }}>
      <Icon className={icon} aria-hidden="true" />
    </span>
  )
}

export function ColorPicker({ value, onChange, colors }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Color">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={c}
          onClick={() => onChange(c)}
          className={`h-8 w-8 rounded-full ring-offset-2 ring-offset-white transition focus-visible:outline-none focus-visible:ring-2 dark:ring-offset-slate-900 ${
            value === c ? 'ring-2 ring-slate-900 dark:ring-white' : 'hover:scale-110'
          }`}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  )
}

export function Segmented({ value, onChange, options, className = '' }) {
  return (
    <div className={`inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800 ${className}`} role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-semibold transition ${
            value === o.value
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          {o.icon && <o.icon className="h-4 w-4" aria-hidden="true" />}
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-800">
      {label && <p className="mb-1 font-semibold text-slate-900 dark:text-white">{label}</p>}
      {payload.map((p) => (
        <p key={p.dataKey || p.name} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color || p.payload?.fill }} />
          <span>{p.name}</span>
          <span className="ml-auto font-semibold">{formatter(p.value)}</span>
        </p>
      ))}
    </div>
  )
}
