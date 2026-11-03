import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, MailCheck, UserPlus } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.password.length < 8) return setError('Use at least 8 characters for your password.')
    if (form.password !== form.confirm) return setError('The passwords do not match.')
    setLoading(true)
    const { data, error: err } = await signUp(form.email.trim(), form.password, form.name.trim())
    setLoading(false)
    if (err) return setError(err.message)
    if (data.session) navigate('/', { replace: true })
    else setSent(true)
  }

  if (sent) {
    return (
      <AuthLayout title="Check your email" subtitle={`We sent a confirmation link to ${form.email}.`}
        footer={<Link to="/login" className="font-semibold text-brand-700 hover:underline dark:text-brand-300">Back to sign in</Link>}>
        <div className="flex items-start gap-3 rounded-xl bg-brand-50 p-4 text-sm text-brand-900 dark:bg-brand-950/50 dark:text-brand-100">
          <MailCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p>Open the link in that email to activate your account, then sign in. It can take a minute to arrive; check your spam folder too.</p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start tracking your money in a couple of minutes."
      footer={<>Already have an account? <Link to="/login" className="font-semibold text-brand-700 hover:underline dark:text-brand-300">Sign in</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="name" className="label">Full name</label>
          <input id="name" type="text" autoComplete="name" required className="input" value={form.name} onChange={set('name')} />
        </div>
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" type="email" autoComplete="email" required className="input" placeholder="you@example.com" value={form.email} onChange={set('email')} />
        </div>
        <div>
          <label htmlFor="password" className="label">Password</label>
          <div className="relative">
            <input id="password" type={show ? 'text' : 'password'} autoComplete="new-password" required minLength={8} className="input pr-11"
              value={form.password} onChange={set('password')} />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-400 hover:text-slate-600"
              aria-label={show ? 'Hide password' : 'Show password'}>
              {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-slate-500">At least 8 characters.</p>
        </div>
        <div>
          <label htmlFor="confirm" className="label">Confirm password</label>
          <input id="confirm" type={show ? 'text' : 'password'} autoComplete="new-password" required className="input" value={form.confirm} onChange={set('confirm')} />
        </div>
        {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  )
}
