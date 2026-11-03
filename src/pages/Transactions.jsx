import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Pencil, Plus, ReceiptText, Search, Trash2, X } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/format'
import { downloadFile, toCSV } from '../lib/csv'
import useDebounce from '../hooks/useDebounce'
import ConfirmDialog from '../components/ConfirmDialog'
import TransactionModal from '../components/TransactionModal'
import { CategoryIcon, EmptyState, PageHeader, Spinner } from '../components/ui'

const PAGE_SIZE = 20
const EMPTY = { search: '', type: '', category: '', account: '', from: '', to: '' }

function applyFilters(q, f) {
  if (f.type) q = q.eq('type', f.type)
  if (f.category === 'none') q = q.is('category_id', null)
  else if (f.category) q = q.eq('category_id', f.category)
  if (f.account) q = q.eq('account_id', f.account)
  if (f.from) q = q.gte('transaction_date', f.from)
  if (f.to) q = q.lte('transaction_date', f.to)
  if (f.search) q = q.ilike('description', `%${f.search.replace(/[%_\\]/g, (m) => `\\${m}`)}%`)
  return q
}

export default function Transactions() {
  const { categories, accounts, categoryMap, accountMap, fmt, version, refresh } = useData()
  const toast = useToast()
  const [filters, setFilters] = useState(EMPTY)
  const [page, setPage] = useState(0)
  const [rows, setRows] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  const debouncedSearch = useDebounce(filters.search)
  const active = { ...filters, search: debouncedSearch }
  const activeKey = JSON.stringify(active)

  useEffect(() => setPage(0), [activeKey])

  const load = useCallback(async () => {
    setLoading(true)
    const from = page * PAGE_SIZE
    const { data, count: total, error } = await applyFilters(
      supabase.from('transactions').select('*', { count: 'exact' }),
      JSON.parse(activeKey),
    )
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)
    if (error) toast.error(error.message)
    setRows((data || []).map((r) => ({ ...r, amount: Number(r.amount) })))
    setCount(total || 0)
    setLoading(false)
  }, [page, activeKey, toast])

  useEffect(() => {
    load()
  }, [load, version])

  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }))
  const hasFilters = Object.values(filters).some(Boolean)
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE))

  async function confirmDelete() {
    setBusy(true)
    const { error } = await supabase.from('transactions').delete().eq('id', deleting.id)
    setBusy(false)
    if (error) return toast.error(error.message)
    toast.success('Transaction deleted.')
    setDeleting(null)
    refresh()
  }

  async function exportCsv() {
    const { data, error } = await applyFilters(supabase.from('transactions').select('*'), active)
      .order('transaction_date', { ascending: false })
      .limit(10000)
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
    downloadFile(`ledgerly-transactions-${new Date().toISOString().slice(0, 10)}.csv`, csv)
    toast.success(`Exported ${data.length} transactions.`)
  }

  return (
    <>
      <PageHeader title="Transactions" description="Search, filter and edit everything you have recorded.">
        <button onClick={exportCsv} className="btn btn-secondary"><Download className="h-4 w-4" aria-hidden="true" /> Export CSV</button>
        <button onClick={() => { setEditing(null); setModalOpen(true) }} className="btn btn-primary"><Plus className="h-4 w-4" aria-hidden="true" /> Add</button>
      </PageHeader>

      <div className="card mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative sm:col-span-2">
            <label htmlFor="f-search" className="sr-only">Search description</label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input id="f-search" type="search" className="input pl-9" placeholder="Search description" value={filters.search} onChange={set('search')} />
          </div>
          <div>
            <label htmlFor="f-type" className="sr-only">Type</label>
            <select id="f-type" className="input" value={filters.type} onChange={set('type')}>
              <option value="">All types</option>
              <option value="expense">Expenses</option>
              <option value="income">Income</option>
            </select>
          </div>
          <div>
            <label htmlFor="f-cat" className="sr-only">Category</label>
            <select id="f-cat" className="input" value={filters.category} onChange={set('category')}>
              <option value="">All categories</option>
              <option value="none">Uncategorized</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}{c.type === 'income' ? ' (income)' : ''}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="f-acc" className="sr-only">Account</label>
            <select id="f-acc" className="input" value={filters.account} onChange={set('account')}>
              <option value="">All accounts</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <label htmlFor="f-from">From</label>
            <input id="f-from" type="date" className="input !w-auto" value={filters.from} onChange={set('from')} />
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <label htmlFor="f-to">To</label>
            <input id="f-to" type="date" className="input !w-auto" value={filters.to} onChange={set('to')} />
          </div>
          {hasFilters && (
            <button onClick={() => setFilters(EMPTY)} className="btn btn-ghost !py-2"><X className="h-4 w-4" aria-hidden="true" /> Clear filters</button>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading && rows.length === 0 ? (
          <div className="grid place-items-center py-16"><Spinner className="h-6 w-6" /></div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title={hasFilters ? 'No matching transactions' : 'No transactions yet'}
            message={hasFilters ? 'Try widening or clearing your filters.' : 'Record your first income or expense to get started.'}
            action={!hasFilters && <button onClick={() => { setEditing(null); setModalOpen(true) }} className="btn btn-primary"><Plus className="h-4 w-4" aria-hidden="true" /> Add transaction</button>}
          />
        ) : (
          <>
            <div className="hidden grid-cols-[1fr_9rem_9rem_8rem_5.5rem] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 md:grid">
              <span>Description</span><span>Account</span><span>Date</span><span className="text-right">Amount</span><span className="sr-only">Actions</span>
            </div>
            <ul className={`divide-y divide-slate-100 dark:divide-slate-800 ${loading ? 'opacity-60' : ''}`}>
              {rows.map((t) => {
                const c = categoryMap.get(t.category_id)
                return (
                  <li key={t.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1 px-4 py-3 md:grid-cols-[1fr_9rem_9rem_8rem_5.5rem] md:gap-4 md:px-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <CategoryIcon category={c} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{t.description || c?.name || 'Transaction'}</p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {c?.name || 'Uncategorized'}<span className="md:hidden"> &middot; {formatDate(t.transaction_date, { month: 'short', day: 'numeric' })}</span>
                        </p>
                      </div>
                    </div>
                    <span className="hidden truncate text-sm text-slate-600 dark:text-slate-300 md:block">{accountMap.get(t.account_id)?.name}</span>
                    <span className="hidden text-sm text-slate-600 dark:text-slate-300 md:block">{formatDate(t.transaction_date)}</span>
                    <span className={`col-start-3 row-start-1 text-right text-sm font-bold md:col-auto md:row-auto ${t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                      {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                    </span>
                    <div className="col-span-3 flex justify-end gap-1 md:col-span-1">
                      <button className="btn-icon" aria-label="Edit transaction" onClick={() => { setEditing(t); setModalOpen(true) }}><Pencil className="h-4 w-4" /></button>
                      <button className="btn-icon hover:!text-rose-600" aria-label="Delete transaction" onClick={() => setDeleting(t)}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </li>
                )
              })}
            </ul>
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm dark:border-slate-800">
              <p className="text-slate-500 dark:text-slate-400">
                {page * PAGE_SIZE + 1}-{Math.min(count, (page + 1) * PAGE_SIZE)} of {count}
              </p>
              <div className="flex items-center gap-1">
                <button className="btn-icon" disabled={page === 0} onClick={() => setPage((p) => p - 1)} aria-label="Previous page"><ChevronLeft className="h-5 w-5" /></button>
                <span className="px-2 text-slate-600 dark:text-slate-300">{page + 1} / {pages}</span>
                <button className="btn-icon" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)} aria-label="Next page"><ChevronRight className="h-5 w-5" /></button>
              </div>
            </div>
          </>
        )}
      </div>

      <TransactionModal open={modalOpen} onClose={() => setModalOpen(false)} transaction={editing} />
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete transaction"
        message={deleting ? `Delete "${deleting.description || 'this transaction'}" for ${fmt(deleting.amount)}? Account balances will update. This cannot be undone.` : ''}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
        loading={busy}
      />
    </>
  )
}
