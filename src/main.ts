import '@fontsource-variable/inter'
import './style.css'

import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import { setUnauthorizedHandler } from './api/client'
import router from './router'
import { useSessionStore } from './stores/session'

// Before accounts, the shared password sat in localStorage. Sessions are an HttpOnly cookie now;
// don't leave the old secret lying around in browsers that used that version.
try {
  localStorage.removeItem('password')
} catch {
  // Storage blocked: nothing was stored either
}

const app = createApp(App)

app.use(createPinia())
app.use(router)

// A session that ended (expired, or logged out from another device) sends the user to log in,
// and back to the same page afterwards
setUnauthorizedHandler(() => {
  useSessionStore().clear()
  const next = router.currentRoute.value.fullPath
  router.push({ name: 'login', query: next === '/' ? {} : { next } })
})

app.mount('#app')
