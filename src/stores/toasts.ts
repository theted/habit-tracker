import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ToastAction {
  label: string
  run: () => unknown
}

export interface Toast {
  id: number
  message: string
  tone: 'success' | 'error' | 'info'
  action?: ToastAction
}

const MAX_VISIBLE = 3

export const useToastStore = defineStore('toasts', () => {
  const toasts = ref<Toast[]>([])
  // Each toast's countdown, which stops while the pointer is over the toasts
  const timers = new Map<
    number,
    { handle?: ReturnType<typeof setTimeout>; remaining: number; started: number }
  >()
  let paused = false
  let nextId = 1

  const dismiss = (id: number) => {
    clearTimeout(timers.get(id)?.handle)
    timers.delete(id)
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  const start = (id: number) => {
    const timer = timers.get(id)
    if (!timer) return
    timer.started = Date.now()
    timer.handle = setTimeout(() => dismiss(id), timer.remaining)
  }

  const pause = () => {
    if (paused) return
    paused = true
    for (const timer of timers.values()) {
      clearTimeout(timer.handle)
      timer.remaining -= Date.now() - timer.started
    }
  }

  const resume = () => {
    if (!paused) return
    paused = false
    for (const id of timers.keys()) start(id)
  }

  // A toast with an action (Undo) stays longer, so there's time to reach it
  const show = (
    message: string,
    {
      tone = 'success',
      action,
      duration = action ? 7000 : 4000
    }: { tone?: Toast['tone']; action?: ToastAction; duration?: number } = {}
  ) => {
    const id = nextId++
    toasts.value.push({ id, message, tone, action })
    timers.set(id, { remaining: duration, started: Date.now() })
    if (!paused) start(id)
    while (toasts.value.length > MAX_VISIBLE) dismiss(toasts.value[0]!.id)
    return id
  }

  const error = (err: unknown, fallback = 'Something went wrong') =>
    show(err instanceof Error && err.message ? err.message : fallback, {
      tone: 'error',
      duration: 6000
    })

  return { toasts, show, error, dismiss, pause, resume }
})
