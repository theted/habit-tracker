import { useIntervalFn, useNow } from '@vueuse/core'

// The current time, refreshed once a minute: enough for "today" to roll over on a page left open,
// without re-rendering every frame
export const useMinuteClock = () =>
  useNow({ scheduler: (callback) => useIntervalFn(callback, 60_000) })
