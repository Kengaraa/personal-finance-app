import { useEffect, useState } from 'react'
import { Download, KeyRound, LogOut, Monitor, Moon, Smartphone, Sun, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useTheme } from '../context/ThemeContext'
import { useToast } from '../context/ToastContext'
import useInstallPrompt from '../hooks/useInstallPrompt'
import { supabase } from '../lib/supabase'
import { CURRENCIES } from '../lib/icons'
import { downloadFile, toCSV } from '../lib/csv'
import Modal from '../components/Modal'
import { PageHeader, Segmented } from '../components/ui'

function Section({ title, description, children }) {
  return (
    <section className="card">
      <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <h2 className="text-base font-bold">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      <div className="px-5 py-5">{children}</div>
    </section>
  )
}

export default function Settings() {
  const { user, signOut, updatePassword } = useAuth()
  const { profile, updateProfile, categoryMap, accountMap, fmt, refresh } = useData()
  const { theme, setTheme } = useTheme()
  const toast = useToast()
  const { canInstall, installed, install } = useInstallPrompt()

  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [saving, setSaving] = useState(false)
  const [pw, setPw] = useState({ next: '', confirm: '' })
  const [pwError, setPwError] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    if (profile) {
      setName(profile.full_name || '')
      setCurrency(profile.currency || 'USD')
    }
  }, [profile])

  async function saveProfile(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await updateProfile({ full_name: name.trim() || null, currency })
    setSaving(false)
    if (error) toast.error(error.message)
    else toast.success('Profile saved.')
  }

  async function changePassword(e) {
    e.preventDefault()
    setPwError('')
    if (pw.next.length < 8) return setPwError('Use at least 8 characters for your password.')
    if (pw.next !== pw.confirm) return setPwError('The passwords do not match.')
    setPwSaving(true)
    const { error } = await updatePassword(pw.next)
    setPwSaving(false)
    if (error) return setPwError(error.message)
    setPw({ next: '', confirm: '' })
    toast.success('Password updated.')
  }

  async function exportAll() {
    const { data, error } = await supabase.from('transactions').select('*').order('transaction_date', { ascending: false }).limit(50000)
    if (error) return toast.error(error.message)
    const csv = toCSV(data, [
      { label: 'Date', key: 'transaction_date' },
      { label: 'Type', key: 'type' },
      { label: 'Amount', key: 'amount' },
      { label: 'Description', key: 'description' },
      { label: 'Category', get: (r) => categoryMap.get(r.category_id)?.name || '' },
      { label: 'Account', get: (r) => accountMap.get(r.account_id)?.name || '' },
      { label: 'Notes', key: 'notes' },
    ])
    downloadFile('ledgerly-all-transactions.csv', csv)
    toast.success(`Exported ${data.length} transactions.`)
  }

  async function resetData() {
    setResetting(true)
    // Order matters only for readability: foreign keys cascade from accounts and categories.
    const results = await Promise.all([
      supabase.from('transactions').delete().eq('user_id', user.id),
      supabase.from('budgets').delete().eq('user_id', user.id),
      supabase.from('goals').delete().eq('user_id', user.id),
    ])
    const failed = results.find((r) => r.error)
    if (!failed) {
      const acc = await supabase.from('accounts').delete().eq('user_id', user.id)
      if (acc.error) results.push(acc)
    }
    setResetting(false)
    const err = [...results].find((r) => r.error)
    if (err) return toast.error(err.error.message)
    toast.success('All accounts, transactions, budgets and goals were deleted.')
    setResetOpen(false)
    setConfirmText('')
    refresh()
  }

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ]

  return (
    <>
      <PageHeader title="Settings" description="Manage your profile, appearance and data." />
      <div className="mx-auto grid max-w-3xl gap-6">
        <Section title="Profile" description="Your name and preferred currency.">
          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <label htmlFor="s-email" className="label">Email</label>
              <input id="s-email" className="input" value={user.email} disabled />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="s-name" className="label">Full name</label>
                <input id="s-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
              </div>
              <div>
                <label htmlFor="s-currency" className="label">Currency</label>
                <select id="s-currency" className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  {CURRENCIES.map(([code, label]) => <option key={code} value={code}>{code} - {label}</option>)}
                </select>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Changing currency only changes how amounts are displayed. Existing amounts are not converted. Example: {fmt(1234.5, { currency })}</p>
            <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save profile'}</button>
          </form>
        </Section>

        <Section title="Appearance">
          <Segmented value={theme} onChange={setTheme} options={themeOptions} />
        </Section>

        <Section title="Install app" description="Add Ledgerly to your home screen or desktop for quick access, offline loading and a full-screen view.">
          {installed ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">Ledgerly is installed on this device.</p>
          ) : canInstall ? (
            <button className="btn btn-primary" onClick={install}><Smartphone className="h-4 w-4" aria-hidden="true" /> Install Ledgerly</button>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Use your browser menu and choose Install app or Add to Home Screen. On iPhone and iPad, open the Share menu in Safari and choose Add to Home Screen.
            </p>
          )}
        </Section>

        <Section title="Password">
          <form onSubmit={changePassword} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="s-new" className="label">New password</label>
                <input id="s-new" type="password" autoComplete="new-password" className="input" value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} />
              </div>
              <div>
                <label htmlFor="s-confirm" className="label">Confirm password</label>
                <input id="s-confirm" type="password" autoComplete="new-password" className="input" value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} />
              </div>
            </div>
            {pwError && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{pwError}</p>}
            <button className="btn btn-secondary" disabled={pwSaving || !pw.next}><KeyRound className="h-4 w-4" aria-hidden="true" /> {pwSaving ? 'Updating...' : 'Update password'}</button>
          </form>
        </Section>

        <Section title="Your data">
          <div className="flex flex-col gap-3 sm:flex-row">
            <button className="btn btn-secondary" onClick={exportAll}><Download className="h-4 w-4" aria-hidden="true" /> Export all transactions (CSV)</button>
            <button className="btn btn-secondary !text-rose-600 dark:!text-rose-400" onClick={() => setResetOpen(true)}><Trash2 className="h-4 w-4" aria-hidden="true" /> Delete all my data</button>
          </div>
        </Section>

        <button className="btn btn-secondary w-full sm:hidden" onClick={signOut}><LogOut className="h-4 w-4" aria-hidden="true" /> Sign out</button>
      </div>

      <Modal open={resetOpen} onClose={() => setResetOpen(false)} size="sm" title="Delete all data"
        footer={<div className="flex justify-end gap-2"><button className="btn btn-secondary" onClick={() => setResetOpen(false)}>Cancel</button><button className="btn btn-danger" disabled={confirmText !== 'DELETE' || resetting} onClick={resetData}>{resetting ? 'Deleting...' : 'Delete everything'}</button></div>}>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          This permanently deletes all of your accounts, transactions, budgets and goals. Categories and your login are kept. This cannot be undone.
        </p>
        <label htmlFor="confirm-delete" className="label mt-4">Type DELETE to confirm</label>
        <input id="confirm-delete" className="input" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
      </Modal>
    </>
  )
}
