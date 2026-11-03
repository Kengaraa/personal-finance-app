import { useEffect, useState } from 'react'
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'
import { CATEGORY_ICONS, SWATCHES } from '../lib/icons'
import ConfirmDialog from '../components/ConfirmDialog'
import Modal from '../components/Modal'
import { CategoryIcon, ColorPicker, EmptyState, PageHeader, Segmented } from '../components/ui'

function CategoryModal({ open, onClose, category }) {
  const { user } = useAuth()
  const { refresh } = useData()
  const toast = useToast()
  const [form, setForm] = useState({ name: '', type: 'expense', color: SWATCHES[0], icon: 'tag' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setError('')
    setForm(category
      ? { name: category.name, type: category.type, color: category.color, icon: category.icon }
      : { name: '', type: 'expense', color: SWATCHES[0], icon: 'tag' })
  }, [open, category])

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) return setError('Give the category a name.')
    const payload = { name: form.name.trim(), color: form.color, icon: form.icon }
    setSaving(true)
    const { error: err } = category
      ? await supabase.from('categories').update(payload).eq('id', category.id)
      : await supabase.from('categories').insert({ ...payload, type: form.type, user_id: user.id })
    setSaving(false)
    if (err) return setError(err.code === '23505' ? 'You already have a category with that name.' : err.message)
    toast.success(category ? 'Category updated.' : 'Category created.')
    refresh()
    onClose()
  }

  const Preview = <CategoryIcon category={{ color: form.color, icon: form.icon }} />

  return (
    <Modal open={open} onClose={onClose} title={category ? 'Edit category' : 'New category'}
      footer={<div className="flex justify-end gap-2"><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button type="submit" form="category-form" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save category'}</button></div>}>
      <form id="category-form" onSubmit={submit} className="space-y-5">
        {!category && (
          <Segmented className="w-full" value={form.type} onChange={(type) => setForm((f) => ({ ...f, type }))}
            options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]} />
        )}
        <div className="flex items-end gap-3">
          {Preview}
          <div className="flex-1">
            <label htmlFor="c-name" className="label">Name</label>
            <input id="c-name" className="input" maxLength={60} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoFocus required />
          </div>
        </div>
        <div>
          <span className="label">Color</span>
          <ColorPicker colors={SWATCHES} value={form.color} onChange={(color) => setForm((f) => ({ ...f, color }))} />
        </div>
        <div>
          <span className="label">Icon</span>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-10" role="radiogroup" aria-label="Icon">
            {Object.entries(CATEGORY_ICONS).map(([key, Icon]) => (
              <button key={key} type="button" role="radio" aria-checked={form.icon === key} aria-label={key}
                onClick={() => setForm((f) => ({ ...f, icon: key }))}
                className={`grid h-10 place-items-center rounded-lg border transition ${form.icon === key ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300' : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
        {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
      </form>
    </Modal>
  )
}

export default function Categories() {
  const { categories, refresh } = useData()
  const toast = useToast()
  const [editing, setEditing] = useState(null)
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  async function confirmDelete() {
    setBusy(true)
    const { error } = await supabase.from('categories').delete().eq('id', deleting.id)
    setBusy(false)
    if (error) return toast.error(error.message)
    toast.success('Category deleted.')
    setDeleting(null)
    refresh()
  }

  const section = (type, title) => {
    const list = categories.filter((c) => c.type === type)
    return (
      <section className="card" aria-labelledby={`${type}-title`}>
        <h2 id={`${type}-title`} className="border-b border-slate-200 px-5 py-4 text-base font-bold dark:border-slate-800">{title}</h2>
        {list.length === 0 ? <p className="px-5 py-8 text-center text-sm text-slate-500">Nothing here yet.</p> : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {list.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-5 py-3">
                <CategoryIcon category={c} />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{c.name}</span>
                <button className="btn-icon" aria-label={`Edit ${c.name}`} onClick={() => { setEditing(c); setOpen(true) }}><Pencil className="h-4 w-4" /></button>
                <button className="btn-icon hover:!text-rose-600" aria-label={`Delete ${c.name}`} onClick={() => setDeleting(c)}><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </section>
    )
  }

  return (
    <>
      <PageHeader title="Categories" description="Organize transactions the way you think about your money.">
        <button className="btn btn-primary" onClick={() => { setEditing(null); setOpen(true) }}><Plus className="h-4 w-4" aria-hidden="true" /> New category</button>
      </PageHeader>
      {categories.length === 0 ? (
        <div className="card"><EmptyState icon={Tags} title="No categories" message="Create categories to group your income and expenses." /></div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {section('expense', 'Expense categories')}
          {section('income', 'Income categories')}
        </div>
      )}
      <CategoryModal open={open} onClose={() => setOpen(false)} category={editing} />
      <ConfirmDialog open={Boolean(deleting)} title="Delete category"
        message={deleting ? `Delete "${deleting.name}"? Its transactions stay but become uncategorized, and any budget for it is removed.` : ''}
        onConfirm={confirmDelete} onCancel={() => setDeleting(null)} loading={busy} />
    </>
  )
}
