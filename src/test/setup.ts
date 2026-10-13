// Browser APIs jsdom doesn't have
import { afterEach, beforeEach, vi } from 'vitest'

// <dialog>: open and close without the top layer
HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
  this.open = true
}
HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
  if (!this.open) return
  this.open = false
  this.dispatchEvent(new Event('close'))
}

// Reduced motion, so animated numbers land on their value at once
window.matchMedia = (query: string) =>
  ({
    matches: query.includes('prefers-reduced-motion: reduce'),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false
  }) as MediaQueryList

window.requestAnimationFrame = (callback) =>
  setTimeout(() => callback(performance.now()), 0) as unknown as number
window.cancelAnimationFrame = (handle) => clearTimeout(handle)

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})
