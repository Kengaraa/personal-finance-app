import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Download } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'
import { compactMoney, parseISO, toISO } from '../lib/format'
import { downloadFile, toCSV } from '../lib/csv'
import { CategoryIcon, ChartTooltip, EmptyState, PageHeader, PageLoader } from '../components/ui'

const PRESETS = [
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: '3m', label: 'Last 3 months' },
  { value: '6m', label: 'Last 6 months' },
  { value: 'ytd', label: 'Year to date' },
  { value: '12m', label: 'Last 12 months' },
  { value: 'custom', label: 'Custom range' },
]

function presetRange(p) {
  const n = new Date()
  const y = n.getFullYear()
  const m = n.getMonth()
  switch (p) {
    case 'last_month': return [toISO(new Date(y, m - 1, 1)), toISO(new Date(y, m, 0))]
    case '3m': return [toISO(new Date(y, m - 2, 1)), toISO(new Date(y, m + 1, 0))]
    case '6m': return [toISO(new Date(y, m - 5, 1)), toISO(new Date(y, m + 1, 0))]
    case 'ytd': return [toISO(new Date(y, 0, 1)), toISO(n)]
    case '12m': return [toISO(new Date(y, m - 11, 1)), toISO(new Date(y, m + 1, 0))]
    default: return [toISO(new Date(y, m, 1)), toISO(new Date(y, m + 1, 0))]
  }
}

function buildBuckets(from, to, rows) {
  const start = parseISO(from)
  const end = parseISO(to)
  const byDay = (end - start) / 86400000 <= 45
  const buckets = new Map()
  const cursor = new Date(start)
  if (!byDay) cursor.setDate(1)
  while (cursor <= end) {
    const key = byDay ? toISO(cursor) : toISO(cursor).slice(0, 7)
    buckets.set(key, {
      key,
      label: byDay
        ? cursor.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : cursor.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
      income: 0,
      expense: 0,
      net: 0,
    })
    if (byDay) cursor.setDate(cursor.getDate() + 1)
    else cursor.setMonth(cursor.getMonth() + 1)
  }
  for (const r of rows) {
    const b = buckets.get(byDay ? r.transaction_date : r.transaction_date.slice(0, 7))
    if (b) {
      b[r.type] += r.amount
      b.net = b.income - b.expense
    }
  }
  return [...buckets.values()]
}

export default function Reports() {
  const { categoryMap, fmt, currency, version } = useData()
  const toast = useToast()
  const [preset, setPreset] = useState('6m')
  const [[from, to], setRange] = useState(() => presetRange('6m'))
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const choose = (p) => {
    setPreset(p)
    if (p !== 'custom') setRange(presetRange(p))
  }

  useEffect(() => {
    if (!from || !to || from > to) return undefined
    let active = true
    setLoading(true)
    supabase
      .from('transactions')
      .select('id,type,amount,transaction_date,category_id,description')
      .gte('transaction_date', from)
      .lte('transaction_date', to)
      .order('transaction_date')
      .limit(10000)
      .then(({ data, error }) => {
        if (!active) return
        if (error) toast.error(error.message)
        setRows((data || []).map((r) => ({ ...r, amount: Number(r.amount) })))
        setLoading(false)
      })
    return () => { active = false }
  }, [from, to, version, toast])

  const report = useMemo(() => {
    const income = rows.filter((r) => r.type === 'income').reduce((s, r) => s + r.amount, 0)
    const expense = rows.filter((r) => r.type === 'expense').reduce((s, r) => s + r.amount, 0)
    const group = (type) => {
      const map = new Map()
      for (const r of rows) if (r.type === type) map.set(r.category_id || 'none', (map.get(r.category_id || 'none') || 0) + r.amount)
      return [...map.entries()]
        .map(([id, value]) => {
          const c = categoryMap.get(id)
          return { id, value, category: c, name: c?.name || 'Uncategorized', color: c?.color || '#94a3b8' }
        })
        .sort((a, b) => b.value - a.value)
    }
    const days = Math.max(1, Math.round((parseISO(to) - parseISO(from)) / 86400000) + 1)
    return {
      income, expense, net: income - expense, avgDaily: expense / days,
      buckets: from <= to ? buildBuckets(from, to, rows) : [],
      spending: group('expense'),
      earning: group('income'),
    }
  }, [rows, from, to, categoryMap])

  function exportCsv() {
    const csv = toCSV(rows, [
      { label: 'Date', key: 'transaction_date' },
      { label: 'Type', key: 'type' },
      { label: 'Amount', key: 'amount' },
      { label: 'Category', get: (r) => categoryMap.get(r.category_id)?.name || '' },
      { label: 'Description', key: 'description' },
    ])
    downloadFile(`ledgerly-report-${from}-to-${to}.csv`, csv)
  }

  const axis = { fill: '#94a3b8', fontSize: 12 }
  const invalid = from > to

  return (
    <>
      <PageHeader title="Reports" description="Understand your income and spending over time.">
        <label htmlFor="r-preset" className="sr-only">Date range</label>
        <select id="r-preset" className="input !w-auto" value={preset} onChange={(e) => choose(e.target.value)}>
          {PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <button className="btn btn-secondary" onClick={exportCsv} disabled={rows.length === 0}><Download className="h-4 w-4" aria-hidden="true" /> Export CSV</button>
      </PageHeader>

      {preset === 'custom' && (
        <div className="card mb-4 flex flex-wrap items-center gap-4 p-4">
          <div className="flex items-center gap-2 text-sm"><label htmlFor="r-from">From</label><input id="r-from" type="date" className="input !w-auto" value={from} onChange={(e) => setRange([e.target.value, to])} /></div>
          <div className="flex items-center gap-2 text-sm"><label htmlFor="r-to">To</label><input id="r-to" type="date" className="input !w-auto" value={to} onChange={(e) => setRange([from, e.target.value])} /></div>
          {invalid && <p role="alert" className="text-sm text-rose-600">The start date must be before the end date.</p>}
        </div>
      )}

      {loading ? <PageLoader /> : rows.length === 0 ? (
        <div className="card"><EmptyState icon={BarChart3} title="Nothing to report" message="There are no transactions in this date range. Pick a different range or add some transactions." /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {[
              ['Income', fmt(report.income), 'text-emerald-600 dark:text-emerald-400'],
              ['Spending', fmt(report.expense), ''],
              ['Net', fmt(report.net), report.net < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'],
              ['Average daily spend', fmt(report.avgDaily), ''],
            ].map(([label, value, cls]) => (
              <div key={label} className="card p-5">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
                <p className={`mt-2 truncate text-xl font-extrabold tracking-tight sm:text-2xl ${cls}`}>{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="card p-5" aria-labelledby="cmp-title">
              <h2 id="cmp-title" className="text-base font-bold">Income vs spending</h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.buckets} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#94a3b8" strokeOpacity={0.25} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axis} minTickGap={16} />
                    <YAxis tickLine={false} axisLine={false} tick={axis} tickFormatter={(v) => compactMoney(v, currency)} width={64} />
                    <Tooltip cursor={{ fill: '#94a3b8', fillOpacity: 0.12 }} content={<ChartTooltip formatter={(v) => fmt(v)} />} />
                    <Bar dataKey="income" name="Income" fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={26} />
                    <Bar dataKey="expense" name="Spending" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={26} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="card p-5" aria-labelledby="net-title">
              <h2 id="net-title" className="text-base font-bold">Net cash flow</h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={report.buckets} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#94a3b8" strokeOpacity={0.25} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axis} minTickGap={16} />
                    <YAxis tickLine={false} axisLine={false} tick={axis} tickFormatter={(v) => compactMoney(v, currency)} width={64} />
                    <Tooltip content={<ChartTooltip formatter={(v) => fmt(v)} />} />
                    <Line type="monotone" dataKey="net" name="Net" stroke="#6366f1" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="card p-5" aria-labelledby="spend-title">
              <h2 id="spend-title" className="text-base font-bold">Spending by category</h2>
              {report.spending.length === 0 ? <p className="mt-4 text-sm text-slate-500">No expenses in this range.</p> : (
                <div className="mt-4 grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={report.spending} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="92%" paddingAngle={2} stroke="none">
                          {report.spending.map((s) => <Cell key={s.id} fill={s.color} />)}
                        </Pie>
                        <Tooltip content={<ChartTooltip formatter={(v) => fmt(v)} />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="space-y-2">
                    {report.spending.slice(0, 6).map((s) => (
                      <li key={s.id} className="flex items-center gap-2 text-sm">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="truncate">{s.name}</span>
                        <span className="ml-auto shrink-0 font-semibold">{((s.value / report.expense) * 100).toFixed(0)}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <section className="card p-5" aria-labelledby="top-title">
              <h2 id="top-title" className="text-base font-bold">Top spending categories</h2>
              {report.spending.length === 0 ? <p className="mt-4 text-sm text-slate-500">No expenses in this range.</p> : (
                <ul className="mt-4 space-y-3">
                  {report.spending.slice(0, 6).map((s) => (
                    <li key={s.id} className="flex items-center gap-3">
                      <CategoryIcon category={s.category} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.name}</span>
                      <span className="text-sm font-bold">{fmt(s.value)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {report.earning.length > 0 && (
                <>
                  <h3 className="mb-3 mt-6 text-sm font-bold text-slate-500 dark:text-slate-400">Income sources</h3>
                  <ul className="space-y-3">
                    {report.earning.slice(0, 4).map((s) => (
                      <li key={s.id} className="flex items-center gap-3">
                        <CategoryIcon category={s.category} size="sm" />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.name}</span>
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{fmt(s.value)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          </div>
        </>
      )}
    </>
  )
}
