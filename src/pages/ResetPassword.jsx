import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { KeyRound, LinkIcon } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'
import { FullPageSpinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function ResetPassword() {
  const { user, loading, updatePassword } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  if (loading) return <FullPageSpinner />

  if (!user) {
    return (
      <AuthLayout title="Link expired" subtitle="This password reset link is invalid or has already been used."
        footer={<Link to="/forgot-password" className="font-semibold text-brand-700 hover:underline dark:text-brand-300">Request a new link</Link>}>
        <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <LinkIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p>Reset links work once and expire after a short time.</p>
        </div>
      </AuthLayout>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) return setError('Use at least 8 characters for your password.')
    if (password !== confirm) return setError('The passwords do not match.')
    setSaving(true)
    const { error: err } = await updatePassword(password)
    setSaving(false)
    if (err) return setError(err.message)
    toast.success('Password updated.')
    navigate('/', { replace: true })
  }

  return (
    <AuthLayout title="Choose a new password" subtitle="Pick something you have not used elsewhere.">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="password" className="label">New password</label>
          <input id="password" type="password" autoComplete="new-password" required minLength={8} className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div>
          <label htmlFor="confirm" className="label">Confirm new password</label>
          <input id="confirm" type="password" autoComplete="new-password" required className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
        <button type="submit" disabled={saving} className="btn btn-primary w-full">
          <KeyRound className="h-4 w-4" aria-hidden="true" />
          {saving ? 'Saving...' : 'Update password'}
        </button>
      </form>
    </AuthLayout>
  )
}
