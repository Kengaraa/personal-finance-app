import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useSearchParams } from 'react-router-dom'
import {
  ArrowLeftRight, BarChart3, Download, Landmark, LayoutDashboard, LogOut, Menu, Moon, PieChart, Plus,
  Settings, ShieldCheck, Sun, Tags, Target, WifiOff, X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useTheme } from '../context/ThemeContext'
import useInstallPrompt from '../hooks/useInstallPrompt'
import useOnlineStatus from '../hooks/useOnlineStatus'
import Logo from './Logo'
import TransactionModal from './TransactionModal'
import { FullPageSpinner } from './ui'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/accounts', label: 'Accounts', icon: Landmark },
  { to: '/budgets', label: 'Budgets', icon: PieChart },
  { to: '/goals', label: 'Goals', icon: Target },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/categories', label: 'Categories', icon: Tags },
  { to: '/settings', label: 'Settings', icon: Settings },
]

const ADMIN_ITEM = { to: '/admin', label: 'Admin', icon: ShieldCheck }

const TABS = ['/', '/transactions', '/budgets', '/goals']

function SidebarContent({ onNavigate }) {
  const { user, signOut } = useAuth()
  const { profile } = useData()
  const { canInstall, install } = useInstallPrompt()
  const name = profile?.full_name || user.email
  const items = profile?.is_admin ? [...NAV, ADMIN_ITEM] : NAV

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-4 pt-6">
        <Logo />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3" aria-label="Main">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                isActive
                  ? 'bg-brand-50 text-brand-800 dark:bg-brand-950/60 dark:text-brand-200'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
              }`
            }
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-2 border-t border-slate-200 p-4 dark:border-slate-800">
        {canInstall && (
          <button onClick={install} className="btn btn-secondary w-full">
            <Download className="h-4 w-4" aria-hidden="true" /> Install app
          </button>
        )}
        <div className="flex items-center gap-3 rounded-lg px-1 py-1">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-800 dark:bg-brand-900 dark:text-brand-100">
            {name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{name}</p>
            {profile?.full_name && <p className="truncate text-xs text-slate-500">{user.email}</p>}
          </div>
          <button onClick={signOut} className="btn-icon" aria-label="Sign out" title="Sign out">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Layout() {
  const { loading, profile } = useData()
  const { resolved, setTheme } = useTheme()
  const online = useOnlineStatus()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [drawer, setDrawer] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => setDrawer(false), [location.pathname])

  // Support the "Add transaction" PWA shortcut (/?new=1)
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setAddOpen(true)
      searchParams.delete('new')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (!drawer) return undefined
    const onKey = (e) => e.key === 'Escape' && setDrawer(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawer])

  if (loading && !profile) return <FullPageSpinner />

  const current = [...NAV, ADMIN_ITEM].find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)))

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:block">
        <SidebarContent />
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-slate-900/50 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <div className="pt-safe pb-safe relative h-full w-72 max-w-[85%] animate-slide-right bg-white shadow-2xl dark:bg-slate-900">
            <button onClick={() => setDrawer(false)} className="btn-icon absolute right-3 top-4" aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        {!online && (
          <div className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200" role="status">
            <WifiOff className="h-4 w-4" aria-hidden="true" /> You are offline. Changes cannot be saved until you reconnect.
          </div>
        )}
        <header className="pt-safe sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <div className="lg:hidden"><Logo showText={false} /></div>
            <h2 className="text-base font-bold lg:text-lg">{current?.label || 'Ledgerly'}</h2>
            <div className="ml-auto flex items-center gap-1.5">
              <button
                onClick={() => setTheme(resolved === 'dark' ? 'light' : 'dark')}
                className="btn-icon"
                aria-label={resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {resolved === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <button onClick={() => setAddOpen(true)} className="btn btn-primary">
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Add transaction</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:pb-10">
          <Outlet />
        </main>
      </div>

      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 lg:hidden" aria-label="Quick navigation">
        <ul className="grid grid-cols-5">
          {NAV.filter((n) => TABS.includes(n.to)).map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${
                    isActive ? 'text-brand-700 dark:text-brand-300' : 'text-slate-500 dark:text-slate-400'
                  }`
                }
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {label}
              </NavLink>
            </li>
          ))}
          <li>
            <button onClick={() => setDrawer(true)} className="flex w-full flex-col items-center gap-1 py-2.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <Menu className="h-5 w-5" aria-hidden="true" />
              More
            </button>
          </li>
        </ul>
      </nav>

      <TransactionModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}
