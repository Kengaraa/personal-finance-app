import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { money } from '../lib/format'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const { user } = useAuth()
  const toast = useToast()
  const [profile, setProfile] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [version, setVersion] = useState(0)

  const load = useCallback(async () => {
    const [p, a, b, c] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('accounts').select('*').order('created_at'),
      supabase.from('account_balances').select('*'),
      supabase.from('categories').select('*').order('name'),
    ])
    const failed = [p, a, b, c].find((r) => r.error)
    if (failed) {
      toast.error(`Could not load your data: ${failed.error.message}`)
      return
    }

    let prof = p.data
    if (!prof) {
      // Account created before the database trigger existed: create the profile on demand.
      const created = await supabase
        .from('profiles')
        .insert({ id: user.id, full_name: user.user_metadata?.full_name ?? null })
        .select()
        .single()
      prof = created.data
    }

    const balances = new Map(b.data.map((r) => [r.account_id, Number(r.balance)]))
    setProfile(prof)
    setAccounts(
      a.data.map((acc) => ({
        ...acc,
        initial_balance: Number(acc.initial_balance),
        balance: balances.has(acc.id) ? balances.get(acc.id) : Number(acc.initial_balance),
      })),
    )
    setCategories(c.data)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, toast])

  useEffect(() => {
    let active = true
    setLoading(true)
    load().finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [load, version])

  const refresh = useCallback(() => setVersion((v) => v + 1), [])

  const updateProfile = useCallback(
    async (changes) => {
      const { data, error } = await supabase.from('profiles').update(changes).eq('id', user.id).select().single()
      if (!error) setProfile(data)
      return { data, error }
    },
    [user.id],
  )

  const currency = profile?.currency || 'USD'

  const value = useMemo(
    () => ({
      profile,
      accounts,
      categories,
      loading,
      version,
      currency,
      isAdmin: Boolean(profile?.is_admin),
      refresh,
      updateProfile,
      categoryMap: new Map(categories.map((c) => [c.id, c])),
      accountMap: new Map(accounts.map((a) => [a.id, a])),
      fmt: (v, opts) => money(v, currency, opts),
    }),
    [profile, accounts, categories, loading, version, currency, refresh, updateProfile],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export const useData = () => useContext(DataContext)
