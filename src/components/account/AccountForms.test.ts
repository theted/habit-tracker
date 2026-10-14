import { describe, expect, it } from 'vitest'
import { useSessionStore } from '../../stores/session'
import { useToastStore } from '../../stores/toasts'
import { flushPromises, json, mockFetch, mountWithApp } from '../../test/utils'
import ChangePasswordForm from './ChangePasswordForm.vue'
import ChangeUsernameForm from './ChangeUsernameForm.vue'
import DeleteAccountDialog from './DeleteAccountDialog.vue'

const ted = { id: 1, username: 'ted', createdAt: '2026-10-14T08:00:00.000Z' }

const mountAs = async (component: Parameters<typeof mountWithApp>[0], props = {}) => {
  const result = await mountWithApp(component, props)
  useSessionStore().user = ted
  return result
}

describe('ChangePasswordForm', () => {
  it('changes the password and says other devices were logged out', async () => {
    const fetch = mockFetch(() => json({ user: ted }))
    const { wrapper } = await mountAs(ChangePasswordForm)
    const [current, next] = wrapper.findAll('input[type="password"]')

    await current!.setValue('old password')
    await next!.setValue('new password here')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(fetch.mock.calls[0]![1]).toMatchObject({ method: 'PATCH' })
    expect(JSON.parse(String(fetch.mock.calls[0]![1]!.body))).toEqual({
      currentPassword: 'old password',
      newPassword: 'new password here'
    })
    expect(useToastStore().toasts[0]!.message).toContain('Other devices have been logged out')
    expect((current!.element as HTMLInputElement).value).toBe('')
  })

  it('shows a wrong current password next to that field', async () => {
    mockFetch(() =>
      json(
        {
          error: 'Wrong',
          issues: [{ path: 'currentPassword', message: "That's not your current password" }]
        },
        403
      )
    )
    const { wrapper } = await mountAs(ChangePasswordForm)
    const [current, next] = wrapper.findAll('input[type="password"]')

    await current!.setValue('guess')
    await next!.setValue('new password here')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain("That's not your current password")
    expect(useSessionStore().user).toEqual(ted)
  })
})

describe('ChangeUsernameForm', () => {
  it('renames the account', async () => {
    mockFetch(() => json({ user: { ...ted, username: 'teddy' } }))
    const { wrapper } = await mountAs(ChangeUsernameForm)

    await wrapper.get('input[autocomplete="username"]').setValue('teddy')
    await wrapper.get('input[type="password"]').setValue('my password')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(useSessionStore().user?.username).toBe('teddy')
    expect(useToastStore().toasts[0]!.message).toBe("You're now teddy")
  })
})

describe('DeleteAccountDialog', () => {
  it('deletes the account and goes to the login page', async () => {
    const fetch = mockFetch(() => json(null, 204))
    const { wrapper, router } = await mountAs(DeleteAccountDialog, { open: true })

    await wrapper.get('input[type="password"]').setValue('my password')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(fetch).toHaveBeenCalledWith(
      '/api/account',
      expect.objectContaining({ method: 'DELETE' })
    )
    expect(useSessionStore().user).toBeNull()
    expect(router.currentRoute.value.name).toBe('login')
  })
})
