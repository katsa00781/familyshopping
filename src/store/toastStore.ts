import { create } from 'zustand'

export type ToastVariant = 'success' | 'error' | 'info'

export interface ToastItem {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastState {
  current: ToastItem | null
  showToast: (message: string, variant: ToastVariant) => void
  dismiss: () => void
}

let _toastId = 0

export const useToastStore = create<ToastState>((set) => ({
  current: null,
  showToast: (message, variant) =>
    set({ current: { id: String(++_toastId), message, variant } }),
  dismiss: () => set({ current: null }),
}))
