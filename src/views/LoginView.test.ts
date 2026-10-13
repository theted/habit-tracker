import { describe, expect, it } from 'vitest'
import { getPassword } from '../auth'
import { flushPromises, json, mockFetch, mountWithApp } from '../test/utils'
import LoginView from './LoginView.vue'

describe('LoginView', () => {
  it('rejects a wrong password without storing it', async () => {
    mockFetch(() => json({ error: 'Unauthorized' }, 401))
    const { wrapper, router } = await mountWithApp(LoginView)

    await wrapper.get('input').setValue('nope')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain("That's not the password")
    expect(getPassword()).toBeNull()
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('stores a right password and goes where the user was headed', async () => {
    const fetch = mockFetch(() => json(null, 204))
    const { wrapper, router } = await mountWithApp(LoginView)
    await router.push('/login?next=/habits/3')

    await wrapper.get('input').setValue('secret')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(fetch.mock.calls[0]![1]!.headers).toEqual({ 'X-Password': 'secret' })
    expect(getPassword()).toBe('secret')
    expect(router.currentRoute.value.fullPath).toBe('/habits/3')
  })

  it('never follows ?next= off the site', async () => {
    mockFetch(() => json(null, 204))
    const { wrapper, router } = await mountWithApp(LoginView)
    await router.push('/login?next=//evil.example')

    await wrapper.get('input').setValue('secret')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/')
  })
})
