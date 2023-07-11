import axios, { AxiosResponse } from 'axios'
import type { Habit, Track } from '@prisma/client'

const BASE_URL = 'http://localhost:3000/'

const get = async <T>(path: string): Promise<AxiosResponse<T>> => axios.get<T>(BASE_URL + path)

const post = async <T, U>(path: string, data: T): Promise<AxiosResponse<U>> =>
  axios.post<U>(BASE_URL + path, data)

const getHabits = async () => get<Habit[]>('habits')

const getHabit = async (id: number) => get<Habit>('habits/' + id)

const createHabit = async (habit: Habit) => post<Habit, Habit>('habits', habit)

const deleteHabit = async (id: number) => axios.delete(BASE_URL + 'habits/' + id)

const incrementTrack = async (habitId: Number) =>  post<any, any>('track', { habitId })

export { getHabits, createHabit, getHabit, deleteHabit, incrementTrack }
