import { PieChart, ShieldCheck, Target, TrendingUp } from 'lucide-react'
import Logo from './Logo'

const POINTS = [
  { icon: TrendingUp, title: 'See where it goes', text: 'Every transaction sorted by category, with trends month over month.' },
  { icon: PieChart, title: 'Budget with limits that hold', text: 'Set a monthly cap per category and watch it fill as you spend.' },
  { icon: Target, title: 'Save toward something', text: 'Name a goal, set a date, and track each contribution.' },
  { icon: ShieldCheck, title: 'Your data stays yours', text: 'Row level security means only you can read your records.' },
]

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-brand-800 via-brand-900 to-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-brand-400/10 blur-3xl" aria-hidden="true" />
        <Logo size="lg" className="relative text-white" />
        <div className="relative max-w-md">
          <h2 className="text-4xl font-extrabold leading-tight tracking-tight">Know your money. Spend it on purpose.</h2>
          <ul className="mt-10 space-y-6">
            {POINTS.map(({ icon: Icon, title: t, text }) => (
              <li key={t} className="flex gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/10">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold">{t}</p>
                  <p className="text-sm leading-relaxed text-brand-100/80">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-brand-100/60">Ledgerly personal finance</p>
      </aside>

      <main className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <Logo className="mb-8 lg:hidden" size="lg" />
          <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">{footer}</div>}
        </div>
      </main>
    </div>
  )
}
