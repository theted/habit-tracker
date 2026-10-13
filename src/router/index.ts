import { createRouter, createWebHistory } from 'vue-router'
import { getPassword } from '../auth'
import HomeView from '../views/HomeView.vue'

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
    { path: '/settings', name: 'settings', component: () => import('../views/SettingsView.vue') },
    { path: '/login', name: 'login', component: () => import('../views/LoginView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ],
  scrollBehavior: (_to, _from, saved) => saved ?? { top: 0 }
})

router.beforeEach((to) => {
  if (to.name !== 'login' && !getPassword()) {
    return { name: 'login', query: to.fullPath === '/' ? {} : { next: to.fullPath } }
  }
})

export default router
