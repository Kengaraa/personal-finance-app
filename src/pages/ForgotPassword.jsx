import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, MailCheck, Send } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'
import { useAuth } from '../context/AuthContext'

export default function ForgotPassword() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await resetPassword(email.trim())
    setLoading(false)
    if (err) return setError(err.message)
    setSent(true)
  }

  const back = (
    <Link to="/login" className="inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:underline dark:text-brand-300">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to sign in
    </Link>
  )

  return (
    <AuthLayout title="Reset your password" subtitle="Enter your email and we will send you a link to choose a new password." footer={back}>
      {sent ? (
        <div className="flex items-start gap-3 rounded-xl bg-brand-50 p-4 text-sm text-brand-900 dark:bg-brand-950/50 dark:text-brand-100">
          <MailCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p>If an account exists for {email}, a reset link is on its way.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input id="email" type="email" autoComplete="email" required className="input" placeholder="you@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
          <button type="submit" disabled={loading} className="btn btn-primary w-full">
            <Send className="h-4 w-4" aria-hidden="true" />
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
      )}
    </AuthLayout>
  )
}
