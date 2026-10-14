import { describe, expect, it } from 'vitest'
import { useSessionStore } from '../stores/session'
import { flushPromises, json, mockFetch, mountWithApp } from '../test/utils'
import AuthView from './AuthView.vue'

const ted = { id: 1, username: 'ted', createdAt: '2026-10-14T08:00:00.000Z' }

const mountAuth = async (signupEnabled = true) => {
  const result = await mountWithApp(AuthView)
  useSessionStore().signupEnabled = signupEnabled
  await flushPromises()
  return result
}

const fill = async (
  wrapper: Awaited<ReturnType<typeof mountAuth>>['wrapper'],
  username: string,
  password: string
) => {
  await wrapper.get('input[autocomplete="username"]').setValue(username)
  await wrapper.get('input[type="password"]').setValue(password)
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}

describe('AuthView', () => {
  it('logs in and goes where the user was headed', async () => {
    const fetch = mockFetch(() => json({ user: ted }))
    const { wrapper, router } = await mountAuth()
    await router.push('/login?next=/habits/3')

    await fill(wrapper, 'ted', 'secret password')

    expect(fetch.mock.calls[0]![0]).toBe('/api/auth/login')
    expect(useSessionStore().user).toEqual(ted)
    expect(router.currentRoute.value.fullPath).toBe('/habits/3')
  })

  it('says so when the username or password is wrong', async () => {
    mockFetch(() => json({ error: 'Wrong username or password' }, 401))
    const { wrapper, router } = await mountAuth()

    await fill(wrapper, 'ted', 'nope')

    expect(wrapper.get('[role="alert"]').text()).toBe('Wrong username or password')
    expect(useSessionStore().user).toBeNull()
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('asks for both fields before sending anything', async () => {
    const fetch = mockFetch(() => json({}))
    const { wrapper } = await mountAuth()

    await wrapper.get('form').trigger('submit')

    expect(wrapper.text()).toContain('Enter a username')
    expect(wrapper.text()).toContain('Enter a password')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('creates an account, showing the rules the server applies next to each field', async () => {
    const fetch = mockFetch(() =>
      json(
        { error: 'Bad Request', issues: [{ path: 'password', message: 'At least 8 characters' }] },
        400
      )
    )
    const { wrapper } = await mountAuth()

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Create an account')!
      .trigger('click')
    expect(wrapper.get('h1').text()).toBe('Create your account')
    expect(wrapper.get('input[type="password"]').attributes('autocomplete')).toBe('new-password')

    await fill(wrapper, 'ted', 'short')

    expect(fetch.mock.calls[0]![0]).toBe('/api/auth/register')
    expect(wrapper.text()).toContain('At least 8 characters')
  })

  it('offers no sign-up when it is closed', async () => {
    const { wrapper } = await mountAuth(false)
    expect(wrapper.text()).not.toContain('Create an account')
  })

  it('shows and hides the password', async () => {
    const { wrapper } = await mountAuth()
    const toggle = wrapper.get('button[aria-label="Show password"]')

    await toggle.trigger('click')

    expect(wrapper.find('input[type="password"]').exists()).toBe(false)
    expect(wrapper.get('button[aria-label="Hide password"]').attributes('aria-pressed')).toBe(
      'true'
    )
  })

  it('never follows ?next= off the site', async () => {
    mockFetch(() => json({ user: ted }))
    const { wrapper, router } = await mountAuth()
    await router.push('/login?next=//evil.example')

    await fill(wrapper, 'ted', 'secret password')

    expect(router.currentRoute.value.fullPath).toBe('/')
  })
})
