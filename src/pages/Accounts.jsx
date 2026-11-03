import { useState } from 'react'
import { Archive, Landmark, Pencil, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'
import { ACCOUNT_TYPES, SWATCHES } from '../lib/icons'
import ConfirmDialog from '../components/ConfirmDialog'
import Modal from '../components/Modal'
import { ColorPicker, EmptyState, PageHeader } from '../components/ui'

const BLANK = { name: '', type: 'checking', initial_balance: '0', color: SWATCHES[0], archived: false }

function AccountModal({ open, onClose, account }) {
  const { user } = useAuth()
  const { refresh } = useData()
  const toast = useToast()
  const [form, setForm] = useState(BLANK)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [lastKey, setLastKey] = useState(null)

  const key = open ? account?.id || 'new' : null
  if (key !== lastKey) {
    setLastKey(key)
    if (open) {
      setError('')
      setForm(account ? { name: account.name, type: account.type, initial_balance: String(account.initial_balance), color: account.color, archived: account.archived } : BLANK)
    }
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setError('')
    const initial = Number(form.initial_balance || 0)
    if (!form.name.trim()) return setError('Give the account a name.')
    if (!Number.isFinite(initial)) return setError('Enter a valid opening balance.')
    const payload = { name: form.name.trim(), type: form.type, initial_balance: initial, color: form.color, archived: form.archived }
    setSaving(true)
    const { error: err } = account
      ? await supabase.from('accounts').update(payload).eq('id', account.id)
      : await supabase.from('accounts').insert({ ...payload, user_id: user.id })
    setSaving(false)
    if (err) return setError(err.message)
    toast.success(account ? 'Account updated.' : 'Account created.')
    refresh()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={account ? 'Edit account' : 'New account'}
      footer={<div className="flex justify-end gap-2"><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button type="submit" form="account-form" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save account'}</button></div>}>
      <form id="account-form" onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="acc-name" className="label">Name</label>
          <input id="acc-name" className="input" maxLength={80} placeholder="e.g. Everyday checking" value={form.name} onChange={set('name')} autoFocus required />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="acc-type" className="label">Type</label>
            <select id="acc-type" className="input" value={form.type} onChange={set('type')}>
              {Object.entries(ACCOUNT_TYPES).map(([v, t]) => <option key={v} value={v}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="acc-bal" className="label">Opening balance</label>
            <input id="acc-bal" type="number" step="0.01" inputMode="decimal" className="input" value={form.initial_balance} onChange={set('initial_balance')} />
          </div>
        </div>
        {form.type === 'credit_card' && <p className="text-xs text-slate-500">For a credit card, enter what you owe as a negative opening balance.</p>}
        <div>
          <span className="label">Color</span>
          <ColorPicker colors={SWATCHES} value={form.color} onChange={(color) => setForm((f) => ({ ...f, color }))} />
        </div>
        {account && (
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" checked={form.archived} onChange={(e) => setForm((f) => ({ ...f, archived: e.target.checked }))} />
            Archive this account (hide it from new transactions)
          </label>
        )}
        {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
      </form>
    </Modal>
  )
}

export default function Accounts() {
  const { accounts, fmt, refresh } = useData()
  const toast = useToast()
  const [editing, setEditing] = useState(null)
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  const active = accounts.filter((a) => !a.archived)
  const archived = accounts.filter((a) => a.archived)
  const total = active.reduce((s, a) => s + a.balance, 0)

  async function confirmDelete() {
    setBusy(true)
    const { error } = await supabase.from('accounts').delete().eq('id', deleting.id)
    setBusy(false)
    if (error) return toast.error(error.message)
    toast.success('Account deleted.')
    setDeleting(null)
    refresh()
  }

  const card = (a) => {
    const T = ACCOUNT_TYPES[a.type]
    return (
      <li key={a.id} className="card flex flex-col p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white" style={{ backgroundColor: a.color }}>
            <T.icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{a.name}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{T.label}{a.archived && ' (archived)'}</p>
          </div>
          <div className="-mr-2 -mt-1 flex">
            <button className="btn-icon" aria-label={`Edit ${a.name}`} onClick={() => { setEditing(a); setOpen(true) }}><Pencil className="h-4 w-4" /></button>
            <button className="btn-icon hover:!text-rose-600" aria-label={`Delete ${a.name}`} onClick={() => setDeleting(a)}><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>
        <p className={`mt-5 text-2xl font-extrabold tracking-tight ${a.balance < 0 ? 'text-rose-600 dark:text-rose-400' : ''}`}>{fmt(a.balance)}</p>
      </li>
    )
  }

  return (
    <>
      <PageHeader title="Accounts" description={accounts.length ? `Net balance across active accounts: ${fmt(total)}` : 'Where your money lives.'}>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setOpen(true) }}><Plus className="h-4 w-4" aria-hidden="true" /> New account</button>
      </PageHeader>

      {accounts.length === 0 ? (
        <div className="card">
          <EmptyState icon={Landmark} title="No accounts yet" message="Add a bank account, wallet or card. Balances update automatically as you record transactions."
            action={<button className="btn btn-primary" onClick={() => { setEditing(null); setOpen(true) }}><Plus className="h-4 w-4" aria-hidden="true" /> Create account</button>} />
        </div>
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{active.map(card)}</ul>
          {archived.length > 0 && (
            <>
              <h2 className="mb-3 mt-8 flex items-center gap-2 text-sm font-bold text-slate-500"><Archive className="h-4 w-4" aria-hidden="true" /> Archived</h2>
              <ul className="grid grid-cols-1 gap-4 opacity-75 sm:grid-cols-2 xl:grid-cols-3">{archived.map(card)}</ul>
            </>
          )}
        </>
      )}

      <AccountModal open={open} onClose={() => setOpen(false)} account={editing} />
      <ConfirmDialog open={Boolean(deleting)} title="Delete account"
        message={deleting ? `Delete "${deleting.name}" and every transaction recorded in it? This cannot be undone. Consider archiving the account instead.` : ''}
        onConfirm={confirmDelete} onCancel={() => setDeleting(null)} loading={busy} />
    </>
  )
}
