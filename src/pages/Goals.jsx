import { useEffect, useState } from 'react'
import { CalendarClock, CheckCircle2, Pencil, PiggyBank, Plus, Target, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'
import { daysUntil, formatDate } from '../lib/format'
import { SWATCHES } from '../lib/icons'
import ConfirmDialog from '../components/ConfirmDialog'
import Modal from '../components/Modal'
import { ColorPicker, EmptyState, PageHeader, PageLoader, ProgressBar, Segmented } from '../components/ui'

function GoalModal({ open, onClose, goal, onSaved }) {
  const { user } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({ name: '', target_amount: '', current_amount: '0', target_date: '', color: SWATCHES[0] })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setError('')
    setForm(goal
      ? { name: goal.name, target_amount: String(goal.target_amount), current_amount: String(goal.current_amount), target_date: goal.target_date || '', color: goal.color }
      : { name: '', target_amount: '', current_amount: '0', target_date: '', color: SWATCHES[0] })
  }, [open, goal])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setError('')
    const target = Number(form.target_amount)
    const current = Number(form.current_amount || 0)
    if (!form.name.trim()) return setError('Give the goal a name.')
    if (!Number.isFinite(target) || target <= 0) return setError('Enter a target amount greater than zero.')
    if (!Number.isFinite(current) || current < 0) return setError('Saved so far cannot be negative.')
    const payload = { name: form.name.trim(), target_amount: target, current_amount: current, target_date: form.target_date || null, color: form.color }
    setSaving(true)
    const { error: err } = goal
      ? await supabase.from('goals').update(payload).eq('id', goal.id)
      : await supabase.from('goals').insert({ ...payload, user_id: user.id })
    setSaving(false)
    if (err) return setError(err.message)
    toast.success(goal ? 'Goal updated.' : 'Goal created.')
    onSaved()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={goal ? 'Edit goal' : 'New goal'}
      footer={<div className="flex justify-end gap-2"><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button type="submit" form="goal-form" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save goal'}</button></div>}>
      <form id="goal-form" onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="g-name" className="label">Goal name</label>
          <input id="g-name" className="input" maxLength={80} placeholder="e.g. Emergency fund" value={form.name} onChange={set('name')} autoFocus required />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="g-target" className="label">Target amount</label>
            <input id="g-target" type="number" inputMode="decimal" step="0.01" min="0.01" className="input" value={form.target_amount} onChange={set('target_amount')} required />
          </div>
          <div>
            <label htmlFor="g-current" className="label">Saved so far</label>
            <input id="g-current" type="number" inputMode="decimal" step="0.01" min="0" className="input" value={form.current_amount} onChange={set('current_amount')} />
          </div>
        </div>
        <div>
          <label htmlFor="g-date" className="label">Target date <span className="font-normal text-slate-400">(optional)</span></label>
          <input id="g-date" type="date" className="input" value={form.target_date} onChange={set('target_date')} />
        </div>
        <div>
          <span className="label">Color</span>
          <ColorPicker colors={SWATCHES} value={form.color} onChange={(color) => setForm((f) => ({ ...f, color }))} />
        </div>
        {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
      </form>
    </Modal>
  )
}

function FundsModal({ open, onClose, goal, onSaved }) {
  const { fmt } = useData()
  const toast = useToast()
  const [mode, setMode] = useState('add')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) { setMode('add'); setAmount(''); setError('') }
  }, [open, goal])

  async function submit(e) {
    e.preventDefault()
    setError('')
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) return setError('Enter an amount greater than zero.')
    const next = mode === 'add' ? goal.current_amount + value : goal.current_amount - value
    if (next < 0) return setError(`You only have ${fmt(goal.current_amount)} saved in this goal.`)
    setSaving(true)
    const { error: err } = await supabase.from('goals').update({ current_amount: Math.round(next * 100) / 100 }).eq('id', goal.id)
    setSaving(false)
    if (err) return setError(err.message)
    toast.success(mode === 'add' ? 'Funds added.' : 'Funds withdrawn.')
    onSaved()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} size="sm" title={goal ? `Update ${goal.name}` : ''} description={goal ? `Saved: ${fmt(goal.current_amount)}` : ''}
      footer={<div className="flex justify-end gap-2"><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button type="submit" form="funds-form" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : mode === 'add' ? 'Add funds' : 'Withdraw'}</button></div>}>
      <form id="funds-form" onSubmit={submit} className="space-y-4">
        <Segmented className="w-full" value={mode} onChange={setMode} options={[{ value: 'add', label: 'Add funds' }, { value: 'remove', label: 'Withdraw' }]} />
        <div>
          <label htmlFor="f-amount" className="label">Amount</label>
          <input id="f-amount" type="number" inputMode="decimal" step="0.01" min="0.01" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus required />
        </div>
        {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
      </form>
    </Modal>
  )
}

export default function Goals() {
  const { fmt } = useData()
  const toast = useToast()
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [reload, setReload] = useState(0)
  const [editing, setEditing] = useState(null)
  const [open, setOpen] = useState(false)
  const [funding, setFunding] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    supabase.from('goals').select('*').order('created_at').then(({ data, error }) => {
      if (!active) return
      if (error) toast.error(error.message)
      setGoals((data || []).map((g) => ({ ...g, target_amount: Number(g.target_amount), current_amount: Number(g.current_amount) })))
      setLoading(false)
    })
    return () => { active = false }
  }, [reload, toast])

  const bump = () => setReload((n) => n + 1)

  async function confirmDelete() {
    setBusy(true)
    const { error } = await supabase.from('goals').delete().eq('id', deleting.id)
    setBusy(false)
    if (error) return toast.error(error.message)
    toast.success('Goal deleted.')
    setDeleting(null)
    bump()
  }

  return (
    <>
      <PageHeader title="Goals" description="Save toward the things that matter.">
        <button className="btn btn-primary" onClick={() => { setEditing(null); setOpen(true) }}><Plus className="h-4 w-4" aria-hidden="true" /> New goal</button>
      </PageHeader>

      {loading ? <PageLoader /> : goals.length === 0 ? (
        <div className="card">
          <EmptyState icon={Target} title="No goals yet" message="Name something you are saving for, set a target and update it as you set money aside."
            action={<button className="btn btn-primary" onClick={() => { setEditing(null); setOpen(true) }}><Plus className="h-4 w-4" aria-hidden="true" /> Create goal</button>} />
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {goals.map((g) => {
            const pct = Math.min(100, (g.current_amount / g.target_amount) * 100)
            const done = g.current_amount >= g.target_amount
            const days = daysUntil(g.target_date)
            return (
              <li key={g.id} className="card flex flex-col p-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white" style={{ backgroundColor: g.color }}>
                    {done ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> : <PiggyBank className="h-5 w-5" aria-hidden="true" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{g.name}</p>
                    {g.target_date ? (
                      <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                        {formatDate(g.target_date)}{!done && days !== null && (days >= 0 ? ` (${days} days left)` : ' (past due)')}
                      </p>
                    ) : <p className="text-xs text-slate-500 dark:text-slate-400">No deadline</p>}
                  </div>
                  <div className="-mr-2 -mt-1 flex">
                    <button className="btn-icon" aria-label={`Edit ${g.name}`} onClick={() => { setEditing(g); setOpen(true) }}><Pencil className="h-4 w-4" /></button>
                    <button className="btn-icon hover:!text-rose-600" aria-label={`Delete ${g.name}`} onClick={() => setDeleting(g)}><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="mt-5 flex items-baseline justify-between">
                  <p className="text-2xl font-extrabold tracking-tight">{fmt(g.current_amount)}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">of {fmt(g.target_amount)}</p>
                </div>
                <ProgressBar className="mt-3" value={g.current_amount} max={g.target_amount} color={g.color} />
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{done ? 'Goal reached' : `${pct.toFixed(0)}% saved, ${fmt(g.target_amount - g.current_amount)} to go`}</span>
                </div>
                <button className="btn btn-secondary mt-4 w-full" onClick={() => setFunding(g)}>Update savings</button>
              </li>
            )
          })}
        </ul>
      )}

      <GoalModal open={open} onClose={() => setOpen(false)} goal={editing} onSaved={bump} />
      <FundsModal open={Boolean(funding)} onClose={() => setFunding(null)} goal={funding} onSaved={bump} />
      <ConfirmDialog open={Boolean(deleting)} title="Delete goal" message={deleting ? `Delete "${deleting.name}"? This cannot be undone.` : ''}
        onConfirm={confirmDelete} onCancel={() => setDeleting(null)} loading={busy} />
    </>
  )
}
