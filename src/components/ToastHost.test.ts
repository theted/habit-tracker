import { describe, expect, it, vi } from 'vitest'
import { useToastStore } from '../stores/toasts'
import { flushPromises, mountWithApp } from '../test/utils'
import ToastHost from './ToastHost.vue'

describe('ToastHost', () => {
  it('shows toasts, runs an action and dismisses', async () => {
    const { wrapper } = await mountWithApp(ToastHost)
    const toasts = useToastStore()
    const undo = vi.fn()

    toasts.show('Read logged', { action: { label: 'Undo', run: undo } })
    toasts.error(new Error('Server is down'))
    await flushPromises()

    expect(wrapper.get('[role="status"]').text()).toContain('Read logged')
    expect(wrapper.get('[role="alert"]').text()).toContain('Server is down')

    await wrapper.get('[role="status"] button').trigger('click')
    expect(undo).toHaveBeenCalledOnce()
    expect(toasts.toasts.map((toast) => toast.message)).toEqual(['Server is down'])

    await wrapper.get('button[aria-label="Dismiss"]').trigger('click')
    expect(toasts.toasts).toEqual([])
  })
})
