// Applies the saved theme before the first paint, so a dark page doesn't flash white.
// Loaded from index.html; the key is the one src/composables/useTheme.ts stores the choice under.
try {
  const mode = localStorage.getItem('habits-theme') || 'auto'
  const dark =
    mode === 'dark' || (mode === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.add(dark ? 'dark' : 'light')
} catch {
  // Storage blocked: the app sets the class itself once it starts
}
