import { useState, useCallback } from 'react'

export interface ToastItem {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
}

let toastId = 0

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const add = useCallback((type: ToastItem['type'], message: string, duration = 4000) => {
    const id = `toast-${++toastId}`
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }, [])

  const success = useCallback((msg: string) => add('success', msg), [add])
  const error = useCallback((msg: string) => add('error', msg), [add])
  const info = useCallback((msg: string) => add('info', msg), [add])
  const warning = useCallback((msg: string) => add('warning', msg), [add])

  return { toasts, success, error, info, warning }
}
