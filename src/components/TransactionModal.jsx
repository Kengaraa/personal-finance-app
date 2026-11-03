import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Modal from './Modal'
import { Segmented } from './ui'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'
import { toISO } from '../lib/format'
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react'

const TYPE_OPTIONS = [
  { value: 'expense', label: 'Expense', icon: ArrowDownCircle },
  { value: 'income', label: 'Income', icon: ArrowUpCircle },
]

export default function TransactionModal({ open, onClose, transaction, onSaved }) {
  const { user } = useAuth()
  const { accounts, categories, refresh } = useData()
  const toast = useToast()
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const selectableAccounts = useMemo(
    () => accounts.filter((a) => !a.archived || a.id === transaction?.account_id),
    [accounts, transaction],
  )

  useEffect(() => {
    if (!open) return
    setError('')
    if (transaction) {
      setForm({
        type: transaction.type,
        amount: String(transaction.amount),
        account_id: transaction.account_id,
        category_id: transaction.category_id || '',
        description: transaction.description || '',
        notes: transaction.notes || '',
        transaction_date: transaction.transaction_date,
      })
    } else {
      setForm({
        type: 'expense',
        amount: '',
        account_id: selectableAccounts[0]?.id || '',
        category_id: '',
        description: '',
        notes: '',
        transaction_date: toISO(new Date()),
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, transaction])

  if (!open || !form) return null

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const typeCategories = categories.filter((c) => c.type === form.type)

  const changeType = (type) =>
    setForm((f) => ({
      ...f,
      type,
      category_id: categories.find((c) => c.id === f.category_id)?.type === type ? f.category_id : '',
    }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const amount = Number(form.amount)
    if (!Number.isFinite(amount) || amount <= 0) return setError('Enter an amount greater than zero.')
    if (!form.account_id) return setError('Choose an account.')
    if (!form.transaction_date) return setError('Choose a date.')

    const payload = {
      type: form.type,
      amount: Math.round(amount * 100) / 100,
      account_id: form.account_id,
      category_id: form.category_id || null,
      description: form.description.trim() || null,
      notes: form.notes.trim() || null,
      transaction_date: form.transaction_date,
    }

    setSaving(true)
    const { error: err } = transaction
      ? await supabase.from('transactions').update(payload).eq('id', transaction.id)
      : await supabase.from('transactions').insert({ ...payload, user_id: user.id })
    setSaving(false)

    if (err) return setError(err.message)
    toast.success(transaction ? 'Transaction updated.' : 'Transaction added.')
    refresh()
    onSaved?.()
    onClose()
  }

  const noAccounts = selectableAccounts.length === 0

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={transaction ? 'Edit transaction' : 'Add transaction'}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" form="transaction-form" className="btn btn-primary" disabled={saving || noAccounts}>
            {saving ? 'Saving...' : transaction ? 'Save changes' : 'Add transaction'}
          </button>
        </div>
      }
    >
      {noAccounts ? (
        <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          You need an account before you can record transactions.{' '}
          <Link to="/accounts" onClick={onClose} className="font-semibold underline">Create an account</Link>
        </div>
      ) : (
        <form id="transaction-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Segmented value={form.type} onChange={changeType} options={TYPE_OPTIONS} className="w-full" />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="tx-amount" className="label">Amount</label>
              <input id="tx-amount" type="number" inputMode="decimal" step="0.01" min="0.01" className="input" placeholder="0.00"
                value={form.amount} onChange={set('amount')} autoFocus required />
            </div>
            <div>
              <label htmlFor="tx-date" className="label">Date</label>
              <input id="tx-date" type="date" className="input" value={form.transaction_date} onChange={set('transaction_date')} required />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="tx-account" className="label">Account</label>
              <select id="tx-account" className="input" value={form.account_id} onChange={set('account_id')} required>
                {selectableAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="tx-category" className="label">Category</label>
              <select id="tx-category" className="input" value={form.category_id} onChange={set('category_id')}>
                <option value="">Uncategorized</option>
                {typeCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="tx-desc" className="label">Description</label>
            <input id="tx-desc" type="text" maxLength={200} className="input" placeholder="e.g. Weekly groceries"
              value={form.description} onChange={set('description')} />
          </div>

          <div>
            <label htmlFor="tx-notes" className="label">Notes <span className="font-normal text-slate-400">(optional)</span></label>
            <textarea id="tx-notes" rows={2} maxLength={1000} className="input resize-none" value={form.notes} onChange={set('notes')} />
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>
          )}
        </form>
      )}
    </Modal>
  )
}
