import Modal from './Modal'

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', onConfirm, onCancel, loading }) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? 'Working...' : confirmLabel}
          </button>
        </div>
      }
    >
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{message}</p>
    </Modal>
  )
}
