import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useToastStore } from './toasts'

beforeEach(() => {
  setActivePinia(createPinia())
  vi.useFakeTimers()
})

describe('useToastStore', () => {
  it('dismisses a plain toast after four seconds', () => {
    const toasts = useToastStore()
    toasts.show('Saved')

    vi.advanceTimersByTime(3900)
    expect(toasts.toasts).toHaveLength(1)
    vi.advanceTimersByTime(200)
    expect(toasts.toasts).toHaveLength(0)
  })

  it('gives a toast with an action longer', () => {
    const toasts = useToastStore()
    toasts.show('Logged', { action: { label: 'Undo', run: () => {} } })

    vi.advanceTimersByTime(6900)
    expect(toasts.toasts).toHaveLength(1)
    vi.advanceTimersByTime(200)
    expect(toasts.toasts).toHaveLength(0)
  })

  it('stops the countdown while paused', () => {
    const toasts = useToastStore()
    toasts.show('Saved')
    vi.advanceTimersByTime(3000)

    toasts.pause()
    vi.advanceTimersByTime(10_000)
    expect(toasts.toasts).toHaveLength(1)

    toasts.resume()
    vi.advanceTimersByTime(900)
    expect(toasts.toasts).toHaveLength(1)
    vi.advanceTimersByTime(200)
    expect(toasts.toasts).toHaveLength(0)
  })

  it('keeps at most three, dropping the oldest', () => {
    const toasts = useToastStore()
    for (const message of ['one', 'two', 'three', 'four']) toasts.show(message)

    expect(toasts.toasts.map((toast) => toast.message)).toEqual(['two', 'three', 'four'])
  })

  it('turns an error into an error toast', () => {
    const toasts = useToastStore()
    toasts.error(new Error('Server is down'))
    toasts.error('not an Error', 'Fallback')

    expect(toasts.toasts.map(({ message, tone }) => [message, tone])).toEqual([
      ['Server is down', 'error'],
      ['Fallback', 'error']
    ])
  })
})
