import '@fontsource-variable/inter'
import './style.css'

import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import { setUnauthorizedHandler } from './api/client'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// A password that stops working (changed on the server) sends the user back to log in
setUnauthorizedHandler(() => {
  const next = router.currentRoute.value.fullPath
  router.push({ name: 'login', query: next === '/' ? {} : { next } })
})

app.mount('#app')
