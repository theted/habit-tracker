import { createRouter, createWebHistory } from 'vue-router'
import { useSessionStore } from '../stores/session'
import HomeView from '../views/HomeView.vue'

declare module 'vue-router' {
  interface RouteMeta {
    // Open to visitors who aren't logged in
    public?: boolean
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    {
      path: '/habits/:id(\\d+)',
      name: 'habit',
      component: () => import('../views/HabitView.vue'),
      props: true
    },
    // The 2023 app's address for a habit
    { path: '/habit/:id(\\d+)', redirect: (to) => ({ name: 'habit', params: to.params }) },
    { path: '/agents', name: 'agents', component: () => import('../views/AgentsView.vue') },
    { path: '/settings', name: 'settings', component: () => import('../views/SettingsView.vue') },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/AuthView.vue'),
      meta: { public: true }
    },
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ],
  scrollBehavior: (to, _from, saved) => saved ?? (to.hash ? { el: to.hash } : { top: 0 })
})

router.beforeEach(async (to) => {
  const session = useSessionStore()
  await session.ensureLoaded().catch(() => {})
  if (to.meta.public) {
    // Someone already logged in has no business on the login page
    return session.user ? { name: 'home' } : true
  }
  if (!session.user) {
    return { name: 'login', query: to.fullPath === '/' ? {} : { next: to.fullPath } }
  }
})

export default router
