import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authApi } from '../api/auth'
import type { User } from '../types'
import { useHabitsStore } from './habits'
import { useMomentsStore } from './moments'

// Who is logged in. The session itself is an HttpOnly cookie the page can't read, so this asks the
// server once, then follows logins and logouts.
export const useSessionStore = defineStore('session', () => {
  const user = ref<User | null>(null)
  const signupEnabled = ref(false)
  const loaded = ref(false)
  let loading: Promise<void> | undefined

  const ensureLoaded = () => {
    if (loaded.value) return Promise.resolve()
    return (loading ??= authApi
      .status()
      .then((status) => {
        user.value = status.user
        signupEnabled.value = status.signupEnabled
        loaded.value = true
      })
      .finally(() => (loading = undefined)))
  }

  // Someone else's habits must never linger in memory
  const forget = () => {
    useHabitsStore().reset()
    useMomentsStore().reset()
  }

  const signIn = (next: User) => {
    if (user.value?.id !== next.id) forget()
    user.value = next
  }

  const login = async (username: string, password: string) =>
    signIn((await authApi.login(username, password)).user)

  const register = async (username: string, password: string) =>
    signIn((await authApi.register(username, password)).user)

  // Forgets the user here; for when the server has already ended the session
  const clear = () => {
    user.value = null
    forget()
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } finally {
      clear()
    }
  }

  const updateAccount = async (input: Parameters<typeof authApi.updateAccount>[0]) => {
    user.value = (await authApi.updateAccount(input)).user
  }

  const deleteAccount = async (password: string) => {
    await authApi.deleteAccount(password)
    clear()
  }

  return {
    user,
    signupEnabled,
    loaded,
    ensureLoaded,
    login,
    register,
    logout,
    clear,
    updateAccount,
    deleteAccount
  }
})
