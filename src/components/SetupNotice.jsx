import { DatabaseZap } from 'lucide-react'
import Logo from './Logo'

export default function SetupNotice() {
  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="card w-full max-w-lg p-8">
        <Logo className="mb-6" />
        <div className="mb-3 flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <DatabaseZap className="h-5 w-5" aria-hidden="true" />
          <h1 className="text-lg font-bold">Supabase is not configured</h1>
        </div>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Create a file named <code className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">.env</code> in the project root
          with your project credentials, then restart the dev server:
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
{`VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY`}
        </pre>
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          See README.md for the full setup, including the database schema.
        </p>
      </div>
    </div>
  )
}
