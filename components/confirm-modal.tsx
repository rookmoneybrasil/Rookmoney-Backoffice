import { AlertTriangle, Trash2, X } from 'lucide-react'

interface ConfirmModalProps {
  title:         string
  message:       string
  confirmLabel?: string
  variant?:      'danger' | 'warning' | 'default'
  loading?:      boolean
  onConfirm:     () => void
  onClose:       () => void
}

export function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirmar',
  variant = 'default',
  loading = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  const confirmClass =
    variant === 'danger'  ? 'bg-red-700 hover:bg-red-600 text-white' :
    variant === 'warning' ? 'bg-amber-600 hover:bg-amber-500 text-white' :
                            'bg-brand-600 hover:bg-brand-500 text-white'

  const iconClass =
    variant === 'danger'  ? 'bg-red-900/30 text-red-400' :
    variant === 'warning' ? 'bg-amber-900/30 text-amber-400' :
                            'bg-brand-900/30 text-brand-400'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-ink-800 border border-white/10 rounded-2xl p-6 w-full max-w-md flex flex-col gap-5 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${iconClass}`}>
            {variant === 'danger' ? <Trash2 className="size-5" /> : <AlertTriangle className="size-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-slate-100">{title}</p>
            <p className="text-sm text-slate-400 mt-1 leading-relaxed">{message}</p>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-400 transition-colors shrink-0">
            <X className="size-4" />
          </button>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} disabled={loading}
            className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={loading}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${confirmClass}`}>
            {loading ? 'Aguarde...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
