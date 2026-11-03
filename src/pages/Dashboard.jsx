import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDownRight, ArrowUpRight, Landmark, PieChart as PieIcon, Plus, ReceiptText, Target, TrendingDown, TrendingUp, Wallet,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useData } from '../context/DataContext'
import { supabase } from '../lib/supabase'
import { compactMoney, formatDate, toISO } from '../lib/format'
import { CategoryIcon, ChartTooltip, EmptyState, PageHeader, PageLoader, ProgressBar } from '../components/ui'

function StatCard({ label, value, icon: Icon, accent, delta, goodWhen }) {
  const hasDelta = delta !== null && delta !== undefined && Number.isFinite(delta)
  const up = delta > 0
  const good = hasDelta && (goodWhen === 'up' ? up : !up)
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <span className={`grid h-9 w-9 place-items-center rounded-lg ${accent}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 truncate text-2xl font-extrabold tracking-tight">{value}</p>
      {hasDelta && goodWhen && Math.abs(delta) >= 0.5 && (
        <p className={`mt-1.5 flex items-center gap-1 text-xs font-semibold ${good ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
          {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          {Math.abs(delta).toFixed(0)}% vs last month
        </p>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { accounts, categoryMap, fmt, currency, version } = useData()
  const [tx, setTx] = useState([])
  const [budgets, setBudgets] = useState([])
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      const now = new Date()
      const start = toISO(new Date(now.getFullYear(), now.getMonth() - 5, 1))
      const [t, b, g] = await Promise.all([
        supabase
          .from('transactions')
          .select('id,type,amount,description,transaction_date,category_id,account_id')
          .gte('transaction_date', start)
          .order('transaction_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(5000),
        supabase.from('budgets').select('id,category_id,amount'),
        supabase.from('goals').select('*').order('created_at').limit(3),
      ])
      if (!active) return
      setTx((t.data || []).map((r) => ({ ...r, amount: Number(r.amount) })))
      setBudgets((b.data || []).map((r) => ({ ...r, amount: Number(r.amount) })))
      setGoals((g.data || []).map((r) => ({ ...r, target_amount: Number(r.target_amount), current_amount: Number(r.current_amount) })))
      setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [version])

  const stats = useMemo(() => {
    const now = new Date()
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      return {
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString(undefined, { month: 'short' }),
        income: 0,
        expense: 0,
      }
    })
    const byKey = new Map(months.map((m) => [m.key, m]))
    const catSpend = new Map()
    const curKey = months[5].key
    for (const t of tx) {
      const m = byKey.get(t.transaction_date.slice(0, 7))
      if (!m) continue
      m[t.type] += t.amount
      if (t.type === 'expense' && m.key === curKey) {
        catSpend.set(t.category_id || 'none', (catSpend.get(t.category_id || 'none') || 0) + t.amount)
      }
    }
    const cur = months[5]
    const prev = months[4]
    const pct = (a, b) => (b > 0 ? ((a - b) / b) * 100 : null)
    const spendList = [...catSpend.entries()]
      .map(([id, value]) => {
        const c = categoryMap.get(id)
        return { id, name: c?.name || 'Uncategorized', color: c?.color || '#94a3b8', value }
      })
      .sort((a, b) => b.value - a.value)
    return {
      months,
      cur,
      incomeDelta: pct(cur.income, prev.income),
      expenseDelta: pct(cur.expense, prev.expense),
      savingsRate: cur.income > 0 ? ((cur.income - cur.expense) / cur.income) * 100 : null,
      spendList,
      catSpend,
    }
  }, [tx, categoryMap])

  const netWorth = accounts.filter((a) => !a.archived).reduce((s, a) => s + a.balance, 0)
  const budgetRows = budgets
    .map((b) => ({ ...b, category: categoryMap.get(b.category_id), spent: stats.catSpend.get(b.category_id) || 0 }))
    .filter((b) => b.category)
    .sort((a, b) => b.spent / b.amount - a.spent / a.amount)
    .slice(0, 4)

  if (loading) return <PageLoader />

  const hasData = accounts.length > 0

  return (
    <>
      <PageHeader
        title="Overview"
        description={new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) + ' at a glance'}
      />

      {!hasData && (
        <div className="card mb-6">
          <EmptyState
            icon={Landmark}
            title="Add your first account"
            message="Accounts hold your balances. Create one, then record a transaction to see your dashboard fill in."
            action={<Link to="/accounts" className="btn btn-primary"><Plus className="h-4 w-4" aria-hidden="true" /> Create account</Link>}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total balance" value={fmt(netWorth)} icon={Wallet} accent="bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300" />
        <StatCard label="Income this month" value={fmt(stats.cur.income)} icon={TrendingUp} delta={stats.incomeDelta} goodWhen="up"
          accent="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" />
        <StatCard label="Spending this month" value={fmt(stats.cur.expense)} icon={TrendingDown} delta={stats.expenseDelta} goodWhen="down"
          accent="bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300" />
        <StatCard label="Savings rate" value={stats.savingsRate === null ? 'No income yet' : `${stats.savingsRate.toFixed(0)}%`} icon={Target}
          accent="bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2" aria-labelledby="trend-title">
          <h2 id="trend-title" className="text-base font-bold">Income and spending</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Last six months</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.months} margin={{ top: 8, right: 4, left: -12, bottom: 0 }} barGap={4}>
                <CartesianGrid vertical={false} stroke="#94a3b8" strokeOpacity={0.25} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(v) => compactMoney(v, currency)} width={64} />
                <Tooltip cursor={{ fill: '#94a3b8', fillOpacity: 0.12 }} content={<ChartTooltip formatter={(v) => fmt(v)} />} />
                <Bar dataKey="income" name="Income" fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="expense" name="Spending" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex gap-5 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand-600" /> Income</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-rose-500" /> Spending</span>
          </div>
        </section>

        <section className="card p-5" aria-labelledby="cat-title">
          <h2 id="cat-title" className="text-base font-bold">Where it went</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Spending by category this month</p>
          {stats.spendList.length === 0 ? (
            <EmptyState icon={PieIcon} title="No spending yet" message="Expenses you add this month will be grouped here." />
          ) : (
            <>
              <div className="mt-2 h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.spendList} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="none">
                      {stats.spendList.map((s) => <Cell key={s.id} fill={s.color} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip formatter={(v) => fmt(v)} />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-3 space-y-2">
                {stats.spendList.slice(0, 5).map((s) => (
                  <li key={s.id} className="flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="truncate">{s.name}</span>
                    <span className="ml-auto font-semibold">{fmt(s.value)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="card lg:col-span-2" aria-labelledby="recent-title">
          <div className="flex items-center justify-between px-5 pt-5">
            <h2 id="recent-title" className="text-base font-bold">Recent transactions</h2>
            <Link to="/transactions" className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300">View all</Link>
          </div>
          {tx.length === 0 ? (
            <EmptyState icon={ReceiptText} title="No transactions yet" message="Use the Add button at the top to record your first one." />
          ) : (
            <ul className="mt-3 divide-y divide-slate-100 px-2 pb-2 dark:divide-slate-800">
              {tx.slice(0, 7).map((t) => {
                const c = categoryMap.get(t.category_id)
                return (
                  <li key={t.id} className="flex items-center gap-3 rounded-lg px-3 py-3">
                    <CategoryIcon category={c} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{t.description || c?.name || 'Transaction'}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{c?.name || 'Uncategorized'} &middot; {formatDate(t.transaction_date, { month: 'short', day: 'numeric' })}</p>
                    </div>
                    <p className={`text-sm font-bold ${t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>
                      {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          <section className="card p-5" aria-labelledby="budget-title">
            <div className="flex items-center justify-between">
              <h2 id="budget-title" className="text-base font-bold">Budgets</h2>
              <Link to="/budgets" className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300">Manage</Link>
            </div>
            {budgetRows.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No budgets set. Add a monthly limit to a category to track it here.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {budgetRows.map((b) => (
                  <li key={b.id}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate font-semibold">{b.category.name}</span>
                      <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{fmt(b.spent)} / {fmt(b.amount)}</span>
                    </div>
                    <ProgressBar value={b.spent} max={b.amount} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5" aria-labelledby="goals-title">
            <div className="flex items-center justify-between">
              <h2 id="goals-title" className="text-base font-bold">Savings goals</h2>
              <Link to="/goals" className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300">Manage</Link>
            </div>
            {goals.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Set a goal to start saving toward something specific.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {goals.map((g) => (
                  <li key={g.id}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate font-semibold">{g.name}</span>
                      <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{Math.min(100, (g.current_amount / g.target_amount) * 100).toFixed(0)}%</span>
                    </div>
                    <ProgressBar value={g.current_amount} max={g.target_amount} color={g.color} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
