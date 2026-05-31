import { create } from 'zustand'
import { uid } from '../utils/helpers'

const useToastStore = create((set, get) => ({
  toasts: [],

  /**
   * Add a toast notification.
   * @param {string} message - The message to display
   * @param {string} type - 'success' | 'error' | 'info' | 'warning'
   * @param {number} duration - Auto-dismiss in ms (0 = no dismiss)
   */
  addToast: (message, type = 'info', duration = 4000) => {
    const id = uid()
    set((s) => ({
      toasts: [...s.toasts, { id, message, type, duration }]
    }))

    if (duration > 0) {
      setTimeout(() => get().removeToast(id), duration)
    }

    return id
  },

  removeToast: (id) => {
    set((s) => ({
      toasts: s.toasts.filter((t) => t.id !== id)
    }))
  },

  clearToasts: () => set({ toasts: [] })
}))

export default useToastStore
