import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, Database, Landmark, PieChart as PieIcon, ReceiptText, Search, ShieldCheck, Target, Tags, UserCheck, UserPlus, Users,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'
import { ACCOUNT_TYPES } from '../lib/icons'
import { formatDate, money } from '../lib/format'
import useDebounce from '../hooks/useDebounce'
import { ChartTooltip, PageHeader, PageLoader, Spinner } from '../components/ui'

const PAGE_SIZE = 15
const num = (n) => Number(n || 0).toLocaleString()

function Stat({ label, value, icon: Icon, accent }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <span className={`grid h-9 w-9 place-items-center rounded-lg ${accent}`}><Icon className="h-5 w-5" aria-hidden="true" /></span>
      </div>
      <p className="mt-3 text-2xl font-extrabold tracking-tight">{value}</p>
    </div>
  )
}

function monthLabel(key) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
}

function UsersTable() {
  const toast = useToast()
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search)
  const [page, setPage] = useState(0)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => setPage(0), [debounced])

  useEffect(() => {
    let active = true
    setLoading(true)
    supabase.rpc('admin_users', { p_search: debounced || null, p_limit: PAGE_SIZE, p_offset: page * PAGE_SIZE }).then(({ data, error }) => {
      if (!active) return
      if (error) toast.error(error.message)
      setRows(data || [])
      setLoading(false)
    })
    return () => { active = false }
  }, [debounced, page, toast])

  const total = Number(rows[0]?.total_count || 0)
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <section className="card mt-6 overflow-hidden" aria-labelledby="users-title">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="users-title" className="text-base font-bold">Users</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Account details and activity counts only. Financial records are not shown.</p>
        </div>
        <div className="relative sm:w-72">
          <label htmlFor="u-search" className="sr-only">Search users</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input id="u-search" type="search" className="input pl-9" placeholder="Search name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading && rows.length === 0 ? (
        <div className="grid place-items-center py-14"><Spinner className="h-6 w-6" /></div>
      ) : rows.length === 0 ? (
        <p className="px-5 py-12 text-center text-sm text-slate-500">No users match your search.</p>
      ) : (
        <div className={`overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 dark:bg-slate-900/60">
              <tr>
                <th scope="col" className="px-5 py-3">User</th>
                <th scope="col" className="px-3 py-3">Joined</th>
                <th scope="col" className="px-3 py-3">Last sign in</th>
                <th scope="col" className="px-3 py-3 text-right">Accounts</th>
                <th scope="col" className="px-3 py-3 text-right">Transactions</th>
                <th scope="col" className="px-5 py-3">Currency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((u) => (
                <tr key={u.id}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{u.full_name || 'No name'}</p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                      </div>
                      {u.is_admin && <span className="badge bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200">Admin</span>}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-600 dark:text-slate-300">{formatDate(u.created_at.slice(0, 10))}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-600 dark:text-slate-300">{u.last_sign_in_at ? formatDate(u.last_sign_in_at.slice(0, 10)) : 'Never'}</td>
                  <td className="px-3 py-3 text-right font-semibold">{num(u.accounts_count)}</td>
                  <td className="px-3 py-3 text-right font-semibold">{num(u.transactions_count)}</td>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{u.currency || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 0 && (
        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 text-sm dark:border-slate-800">
          <p className="text-slate-500 dark:text-slate-400">{page * PAGE_SIZE + 1}-{Math.min(total, (page + 1) * PAGE_SIZE)} of {num(total)}</p>
          <div className="flex items-center gap-1">
            <button className="btn-icon" disabled={page === 0} onClick={() => setPage((p) => p - 1)} aria-label="Previous page"><ChevronLeft className="h-5 w-5" /></button>
            <span className="px-2 text-slate-600 dark:text-slate-300">{page + 1} / {pages}</span>
            <button className="btn-icon" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)} aria-label="Next page"><ChevronRight className="h-5 w-5" /></button>
          </div>
        </div>
      )}
    </section>
  )
}

export default function Admin() {
  const { isAdmin, loading: dataLoading } = useData()
  const toast = useToast()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!isAdmin) return undefined
    let active = true
    supabase.rpc('admin_dashboard').then(({ data, error }) => {
      if (!active) return
      if (error) {
        setFailed(true)
        toast.error(error.message.includes('function') ? 'Admin functions are missing. Run supabase/admin.sql in the SQL Editor.' : error.message)
      } else setStats(data)
      setLoading(false)
    })
    return () => { active = false }
  }, [isAdmin, toast])

  if (dataLoading) return <PageLoader />
  if (!isAdmin) return <Navigate to="/" replace />
  if (loading) return <PageLoader />

  if (failed || !stats) {
    return (
      <>
        <PageHeader title="Admin" description="App-wide statistics." />
        <div className="card p-8 text-center text-sm text-slate-600 dark:text-slate-300">
          Statistics could not be loaded. Make sure <code className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">supabase/admin.sql</code> has been run.
        </div>
      </>
    )
  }

  const t = stats.totals
  const axis = { fill: '#94a3b8', fontSize: 12 }
  const signups = stats.signups_by_month.map((r) => ({ ...r, label: monthLabel(r.month) }))
  const txByMonth = stats.transactions_by_month.map((r) => ({ ...r, label: monthLabel(r.month) }))
  const maxCat = Math.max(1, ...stats.top_categories.map((c) => Number(c.transactions)))

  return (
    <>
      <PageHeader title="Admin" description="App-wide statistics. Only aggregate counts and totals are shown." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total users" value={num(t.users)} icon={Users} accent="bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300" />
        <Stat label="New users (30 days)" value={num(t.new_users_30d)} icon={UserPlus} accent="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" />
        <Stat label="Active users (30 days)" value={num(t.active_users_30d)} icon={UserCheck} accent="bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" />
        <Stat label="Admins" value={num(t.admins)} icon={ShieldCheck} accent="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" />
        <Stat label="Transactions" value={num(t.transactions)} icon={ReceiptText} accent="bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300" />
        <Stat label="Accounts" value={num(t.accounts)} icon={Landmark} accent="bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300" />
        <Stat label="Budgets" value={num(t.budgets)} icon={PieIcon} accent="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300" />
        <Stat label="Goals" value={num(t.goals)} icon={Target} accent="bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="card p-5" aria-labelledby="signup-title">
          <h2 id="signup-title" className="text-base font-bold">New users per month</h2>
          <div className="mt-4 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={signups} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#94a3b8" strokeOpacity={0.25} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axis} minTickGap={12} />
                <YAxis tickLine={false} axisLine={false} tick={axis} allowDecimals={false} />
                <Tooltip cursor={{ fill: '#94a3b8', fillOpacity: 0.12 }} content={<ChartTooltip formatter={num} />} />
                <Bar dataKey="users" name="New users" fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card p-5" aria-labelledby="txm-title">
          <h2 id="txm-title" className="text-base font-bold">Transactions per month</h2>
          <div className="mt-4 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={txByMonth} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#94a3b8" strokeOpacity={0.25} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axis} minTickGap={12} />
                <YAxis tickLine={false} axisLine={false} tick={axis} allowDecimals={false} />
                <Tooltip cursor={{ fill: '#94a3b8', fillOpacity: 0.12 }} content={<ChartTooltip formatter={num} />} />
                <Bar dataKey="income" name="Income" stackId="a" fill="#0d9488" maxBarSize={28} />
                <Bar dataKey="expense" name="Expenses" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card p-5" aria-labelledby="cats-title">
          <h2 id="cats-title" className="flex items-center gap-2 text-base font-bold"><Tags className="h-4 w-4 text-slate-400" aria-hidden="true" /> Most used categories</h2>
          {stats.top_categories.length === 0 ? <p className="mt-4 text-sm text-slate-500">No categorized transactions yet.</p> : (
            <ul className="mt-4 space-y-3">
              {stats.top_categories.map((c) => (
                <li key={`${c.name}-${c.type}`}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="truncate font-medium">{c.name} <span className="text-xs text-slate-400">{c.type}</span></span>
                    <span className="font-semibold">{num(c.transactions)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-brand-600" style={{ width: `${(Number(c.transactions) / maxCat) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5" aria-labelledby="mix-title">
          <h2 id="mix-title" className="flex items-center gap-2 text-base font-bold"><Database className="h-4 w-4 text-slate-400" aria-hidden="true" /> Platform mix</h2>
          <h3 className="mb-2 mt-4 text-sm font-semibold text-slate-500 dark:text-slate-400">Accounts by type</h3>
          {stats.accounts_by_type.length === 0 ? <p className="text-sm text-slate-500">No accounts yet.</p> : (
            <ul className="space-y-2">
              {stats.accounts_by_type.map((a) => (
                <li key={a.type} className="flex justify-between text-sm"><span>{ACCOUNT_TYPES[a.type]?.label || a.type}</span><span className="font-semibold">{num(a.accounts)}</span></li>
              ))}
            </ul>
          )}
          <h3 className="mb-2 mt-6 text-sm font-semibold text-slate-500 dark:text-slate-400">Volume by user currency</h3>
          {stats.volume_by_currency.length === 0 ? <p className="text-sm text-slate-500">No transactions yet.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-slate-500"><tr><th className="py-1 pr-3 font-semibold">Currency</th><th className="px-3 py-1 text-right font-semibold">Txns</th><th className="px-3 py-1 text-right font-semibold">Income</th><th className="py-1 pl-3 text-right font-semibold">Spending</th></tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {stats.volume_by_currency.map((v) => (
                    <tr key={v.currency}>
                      <td className="py-2 pr-3 font-semibold">{v.currency}</td>
                      <td className="px-3 py-2 text-right">{num(v.transactions)}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">{money(v.income, v.currency, { maximumFractionDigits: 0 })}</td>
                      <td className="whitespace-nowrap py-2 pl-3 text-right">{money(v.expense, v.currency, { maximumFractionDigits: 0 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <UsersTable />
    </>
  )
}
