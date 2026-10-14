import { createSharedComposable, useColorMode } from '@vueuse/core'

// 'auto' follows the system. The key is also read by the script public/theme.js, which sets
// the class before the app loads so the page doesn't flash light first.
export const THEME_KEY = 'habits-theme'

export const useTheme = createSharedComposable(() => {
  // disableTransition would inject a <style> element, which the Content-Security-Policy forbids
  const mode = useColorMode({
    storageKey: THEME_KEY,
    initialValue: 'auto',
    disableTransition: false
  })
  return {
    // 'auto' | 'light' | 'dark', as chosen
    preference: mode.store,
    // 'light' | 'dark', as shown
    resolved: mode.state,
    toggle: () => {
      mode.store.value = mode.state.value === 'dark' ? 'light' : 'dark'
    }
  }
})
