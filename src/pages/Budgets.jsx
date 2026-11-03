import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Pencil, PieChart, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'
import { monthLabel, monthRange } from '../lib/format'
import ConfirmDialog from '../components/ConfirmDialog'
import Modal from '../components/Modal'
import { CategoryIcon, EmptyState, PageHeader, PageLoader, ProgressBar } from '../components/ui'

function BudgetModal({ open, onClose, budget, available, onSaved }) {
  const { user } = useAuth()
  const toast = useToast()
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setError('')
    setCategoryId(budget?.category_id || available[0]?.id || '')
    setAmount(budget ? String(budget.amount) : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, budget])

  async function submit(e) {
    e.preventDefault()
    setError('')
    const value = Number(amount)
    if (!categoryId) return setError('Choose a category.')
    if (!Number.isFinite(value) || value <= 0) return setError('Enter a monthly limit greater than zero.')
    setSaving(true)
    const payload = { amount: Math.round(value * 100) / 100 }
    const { error: err } = budget
      ? await supabase.from('budgets').update(payload).eq('id', budget.id)
      : await supabase.from('budgets').insert({ ...payload, category_id: categoryId, user_id: user.id })
    setSaving(false)
    if (err) return setError(err.code === '23505' ? 'That category already has a budget.' : err.message)
    toast.success(budget ? 'Budget updated.' : 'Budget created.')
    onSaved()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={budget ? 'Edit budget' : 'New budget'} description="Limits repeat every month."
      footer={<div className="flex justify-end gap-2"><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button type="submit" form="budget-form" className="btn btn-primary" disabled={saving || (!budget && available.length === 0)}>{saving ? 'Saving...' : 'Save budget'}</button></div>}>
      {!budget && available.length === 0 ? (
        <p className="text-sm text-slate-600 dark:text-slate-300">Every expense category already has a budget. Add a new category first if you need another.</p>
      ) : (
        <form id="budget-form" onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="b-cat" className="label">Category</label>
            <select id="b-cat" className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} disabled={Boolean(budget)}>
              {(budget ? [{ id: budget.category_id, name: budget.category?.name }] : available).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="b-amount" className="label">Monthly limit</label>
            <input id="b-amount" type="number" inputMode="decimal" step="0.01" min="0.01" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus required />
          </div>
          {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
        </form>
      )}
    </Modal>
  )
}

export default function Budgets() {
  const { categories, categoryMap, fmt, version } = useData()
  const toast = useToast()
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [budgets, setBudgets] = useState([])
  const [spend, setSpend] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [local, setLocal] = useState(0)
  const [editing, setEditing] = useState(null)
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    const { start, end } = monthRange(month)
    Promise.all([
      supabase.from('budgets').select('*'),
      supabase.from('transactions').select('category_id,amount').eq('type', 'expense').gte('transaction_date', start).lte('transaction_date', end).limit(10000),
    ]).then(([b, t]) => {
      if (!active) return
      if (b.error || t.error) toast.error((b.error || t.error).message)
      const map = new Map()
      for (const r of t.data || []) map.set(r.category_id, (map.get(r.category_id) || 0) + Number(r.amount))
      setBudgets((b.data || []).map((r) => ({ ...r, amount: Number(r.amount) })))
      setSpend(map)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [month, version, local, toast])

  const rows = useMemo(
    () =>
      budgets
        .map((b) => ({ ...b, category: categoryMap.get(b.category_id), spent: spend.get(b.category_id) || 0 }))
        .filter((b) => b.category)
        .sort((a, b) => b.spent / b.amount - a.spent / a.amount),
    [budgets, spend, categoryMap],
  )

  const available = categories.filter((c) => c.type === 'expense' && !budgets.some((b) => b.category_id === c.id))
  const totalBudget = rows.reduce((s, r) => s + r.amount, 0)
  const totalSpent = rows.reduce((s, r) => s + r.spent, 0)
  const isCurrent = month.getTime() === new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime()

  const shift = (n) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1))

  async function confirmDelete() {
    setBusy(true)
    const { error } = await supabase.from('budgets').delete().eq('id', deleting.id)
    setBusy(false)
    if (error) return toast.error(error.message)
    toast.success('Budget removed.')
    setDeleting(null)
    setLocal((n) => n + 1)
  }

  return (
    <>
      <PageHeader title="Budgets" description="Monthly spending limits by category.">
        <div className="flex items-center rounded-lg border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900">
          <button className="btn-icon" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft className="h-5 w-5" /></button>
          <span className="min-w-[8.5rem] text-center text-sm font-semibold">{monthLabel(month)}</span>
          <button className="btn-icon" onClick={() => shift(1)} disabled={isCurrent} aria-label="Next month"><ChevronRight className="h-5 w-5" /></button>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setOpen(true) }}><Plus className="h-4 w-4" aria-hidden="true" /> New budget</button>
      </PageHeader>

      {loading ? <PageLoader /> : rows.length === 0 ? (
        <div className="card">
          <EmptyState icon={PieChart} title="No budgets yet" message="Pick a category and set a monthly limit. Progress is calculated from your expenses."
            action={<button className="btn btn-primary" onClick={() => { setEditing(null); setOpen(true) }}><Plus className="h-4 w-4" aria-hidden="true" /> Create budget</button>} />
        </div>
      ) : (
        <>
          <div className="card mb-6 p-5">
            <div className="grid grid-cols-3 gap-4 text-center sm:text-left">
              <div><p className="text-xs font-medium text-slate-500 dark:text-slate-400">Budgeted</p><p className="mt-1 text-lg font-extrabold sm:text-2xl">{fmt(totalBudget)}</p></div>
              <div><p className="text-xs font-medium text-slate-500 dark:text-slate-400">Spent</p><p className="mt-1 text-lg font-extrabold sm:text-2xl">{fmt(totalSpent)}</p></div>
              <div><p className="text-xs font-medium text-slate-500 dark:text-slate-400">{totalBudget - totalSpent >= 0 ? 'Remaining' : 'Over by'}</p>
                <p className={`mt-1 text-lg font-extrabold sm:text-2xl ${totalBudget - totalSpent < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{fmt(Math.abs(totalBudget - totalSpent))}</p></div>
            </div>
            <ProgressBar className="mt-4" value={totalSpent} max={totalBudget} />
          </div>

          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {rows.map((b) => {
              const left = b.amount - b.spent
              return (
                <li key={b.id} className="card p-5">
                  <div className="flex items-center gap-3">
                    <CategoryIcon category={b.category} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{b.category.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{fmt(b.spent)} of {fmt(b.amount)}</p>
                    </div>
                    <button className="btn-icon" aria-label={`Edit ${b.category.name} budget`} onClick={() => { setEditing(b); setOpen(true) }}><Pencil className="h-4 w-4" /></button>
                    <button className="btn-icon hover:!text-rose-600" aria-label={`Delete ${b.category.name} budget`} onClick={() => setDeleting(b)}><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <ProgressBar className="mt-4" value={b.spent} max={b.amount} />
                  <p className={`mt-2 text-xs font-semibold ${left < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
                    {left >= 0 ? `${fmt(left)} left` : `${fmt(-left)} over budget`}
                  </p>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <BudgetModal open={open} onClose={() => setOpen(false)} budget={editing} available={available} onSaved={() => setLocal((n) => n + 1)} />
      <ConfirmDialog open={Boolean(deleting)} title="Remove budget" message={deleting ? `Remove the ${deleting.category?.name} budget? Your transactions are not affected.` : ''}
        confirmLabel="Remove" onConfirm={confirmDelete} onCancel={() => setDeleting(null)} loading={busy} />
    </>
  )
}
