import axios from 'axios'
import { clearPassword, getPassword } from './auth'
import type { Habit, HabitSummary, HabitWithTracks, Track } from './types'

// Same origin in production; Vite proxies /api to the server in dev
const http = axios.create({ baseURL: '/api/' })

http.interceptors.request.use((config) => {
  config.headers.set('X-Password', getPassword() ?? '')
  return config
})

http.interceptors.response.use(undefined, (error) => {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    clearPassword()
    window.location.assign('/login')
  }
  return Promise.reject(error)
})

const getHabits = async () => http.get<HabitSummary[]>('habits')

const getHabit = async (id: number) => http.get<HabitWithTracks>('habits/' + id)

const createHabit = async (habit: { title: string }) => http.post<Habit>('habits', habit)

const deleteHabit = async (id: number) => http.delete<Habit>('habits/' + id)

const incrementTrack = async (habitId: number) => http.post<Track>('track', { habitId })

// Bypasses the interceptors: a wrong password here is an answer, not a reason to redirect
const checkPassword = async (password: string) => {
  const res = await axios.get('/api/auth', {
    headers: { 'X-Password': password },
    validateStatus: (status) => status === 204 || status === 401
  })
  return res.status === 204
}

export { getHabits, createHabit, getHabit, deleteHabit, incrementTrack, checkPassword }
