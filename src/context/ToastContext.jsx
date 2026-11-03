import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const STYLES = {
  success: { icon: CheckCircle2, cls: 'text-emerald-600 dark:text-emerald-400' },
  error: { icon: AlertCircle, cls: 'text-rose-600 dark:text-rose-400' },
  info: { icon: Info, cls: 'text-sky-600 dark:text-sky-400' },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const remove = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const push = useCallback(
    (type, message) => {
      const id = `${Date.now()}-${Math.random()}`
      setToasts((t) => [...t.slice(-3), { id, type, message }])
      setTimeout(() => remove(id), 4500)
    },
    [remove],
  )

  const api = useMemo(
    () => ({
      success: (m) => push('success', m),
      error: (m) => push('error', m),
      info: (m) => push('info', m),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:items-end"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const { icon: Icon, cls } = STYLES[t.type]
          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-lg dark:border-slate-700 dark:bg-slate-800"
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${cls}`} aria-hidden="true" />
              <p className="flex-1 text-sm text-slate-700 dark:text-slate-200">{t.message}</p>
              <button onClick={() => remove(t.id)} className="text-slate-400 hover:text-slate-600" aria-label="Dismiss">
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
