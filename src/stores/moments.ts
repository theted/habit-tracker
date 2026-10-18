import { defineStore } from 'pinia'
import { ref } from 'vue'
import { agentsApi } from '../api/agents'
import type { Moment } from '../types'

// What AI agents have reported, oldest first. Agents add to it from elsewhere, so the Agents page
// reloads it each time it opens rather than trusting what's in memory.
export const useMomentsStore = defineStore('moments', () => {
  const moments = ref<Moment[]>([])
  const status = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')

  const load = async () => {
    status.value = status.value === 'ready' ? 'ready' : 'loading'
    try {
      moments.value = await agentsApi.moments()
      status.value = 'ready'
    } catch (err) {
      status.value = moments.value.length ? 'ready' : 'error'
      throw err
    }
  }

  // Optimistic, and put back where it was if the server refuses
  const remove = async (id: number) => {
    const index = moments.value.findIndex((moment) => moment.id === id)
    if (index === -1) return
    const [removed] = moments.value.splice(index, 1)
    try {
      await agentsApi.removeMoment(id)
    } catch (err) {
      moments.value.splice(index, 0, removed!)
      throw err
    }
  }

  const reset = () => {
    moments.value = []
    status.value = 'idle'
  }

  return { moments, status, load, remove, reset }
})
