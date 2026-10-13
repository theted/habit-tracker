import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'
import type { Component } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { Habit } from '../types'

export { flushPromises }

let nextId = 1

export const makeHabit = (overrides: Partial<Habit> = {}): Habit => ({
  id: nextId++,
  title: 'Read',
  description: null,
  emoji: '📚',
  color: 'violet',
  createdAt: '2026-09-01T08:00:00.000Z',
  tracks: [],
  ...overrides
})

export const json = (body: unknown, status = 200) =>
  new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })

// fetch, answered by the handler; every call is recorded on the returned mock
export const mockFetch = (handler: (method: string, url: string, body?: unknown) => Response) => {
  const fetch = vi.fn(async (url: string, init?: RequestInit) =>
    handler(init?.method ?? 'GET', url, init?.body ? JSON.parse(String(init.body)) : undefined)
  )
  vi.stubGlobal('fetch', fetch)
  return fetch
}

export const makeRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div />' } },
      { path: '/habits/:id', name: 'habit', component: { template: '<div />' } },
      { path: '/login', name: 'login', component: { template: '<div />' } }
    ]
  })

// Mounts with a fresh Pinia and a memory router, and makes that Pinia the active one so tests can
// reach the same stores
export const mountWithApp = async (component: Component, props: Record<string, unknown> = {}) => {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = makeRouter()
  await router.push('/')
  const wrapper = mount(component, {
    props,
    attachTo: document.body,
    global: { plugins: [pinia, router] }
  })
  return { wrapper, router }
}
