import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await signIn(email.trim(), password)
    setLoading(false)
    if (err) return setError(err.message)
    navigate(location.state?.from?.pathname || '/', { replace: true })
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to see your accounts, budgets and goals."
      footer={<>New to Ledgerly? <Link to="/register" className="font-semibold text-brand-700 hover:underline dark:text-brand-300">Create an account</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" type="email" autoComplete="email" required className="input" placeholder="you@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="label">Password</label>
            <Link to="/forgot-password" className="mb-1.5 text-sm font-medium text-brand-700 hover:underline dark:text-brand-300">Forgot password?</Link>
          </div>
          <div className="relative">
            <input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" required className="input pr-11"
              value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-400 hover:text-slate-600"
              aria-label={show ? 'Hide password' : 'Show password'}>
              {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          <LogIn className="h-4 w-4" aria-hidden="true" />
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  )
}
