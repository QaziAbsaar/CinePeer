import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react'
import useToastStore from '../store/useToastStore'
import './Toast.css'

const ICON_MAP = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="toast-container" id="toast-container">
      {toasts.map((toast) => {
        const Icon = ICON_MAP[toast.type] || Info
        return (
          <div
            key={toast.id}
            className={`toast toast-${toast.type} slide-up`}
            role="alert"
          >
            <Icon size={18} className="toast-icon" />
            <span className="toast-message">{toast.message}</span>
            <button
              className="toast-close"
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
