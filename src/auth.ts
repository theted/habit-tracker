// The shared password the API expects as X-Password (server/auth.ts). A stopgap until the app has
// real accounts; replacing it means replacing this file and server/auth.ts.
const KEY = 'password'

export const getPassword = (): string | null => {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export const setPassword = (password: string) => localStorage.setItem(KEY, password)

export const clearPassword = () => localStorage.removeItem(KEY)
