import { describe, expect, it, vi } from 'vitest'
import { flushPromises, json, mockFetch, mountWithApp } from '../../test/utils'
import AgentKeys from './AgentKeys.vue'

const laptop = {
  id: 1,
  name: 'Laptop',
  createdAt: '2026-10-01T08:00:00.000Z',
  lastUsedAt: null
}

describe('AgentKeys', () => {
  it('lists keys, and shows a new one once with the command that connects Claude Code', async () => {
    const fetch = mockFetch((method, _url, body) =>
      method === 'POST'
        ? json(
            {
              id: 2,
              name: (body as { name: string }).name,
              createdAt: laptop.createdAt,
              lastUsedAt: null,
              token: 'hab_secret'
            },
            201
          )
        : json([laptop])
    )
    const { wrapper } = await mountWithApp(AgentKeys)
    await flushPromises()
    expect(wrapper.text()).toContain('Laptop')
    expect(wrapper.text()).toContain('never used')

    await wrapper.get('input').setValue('Desktop')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(JSON.parse(String(fetch.mock.calls[1]![1]!.body))).toEqual({ name: 'Desktop' })
    expect(wrapper.get('[data-new-key]').text()).toContain(
      'claude mcp add --transport http --scope user habits http://localhost:3000/mcp --header "Authorization: Bearer hab_secret"'
    )
    expect(wrapper.findAll('li')).toHaveLength(2)

    const done = wrapper.findAll('[data-new-key] button').find((button) => button.text() === 'Done')
    await done!.trigger('click')
    expect(wrapper.find('[data-new-key]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('hab_secret')
  })

  it('copies a command', async () => {
    mockFetch(() => json([]))
    const writeText = vi.fn(async () => {})
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const { wrapper } = await mountWithApp(AgentKeys)
    await flushPromises()

    await wrapper.get('button[aria-label="Copy the command"]').trigger('click')
    await flushPromises()

    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('/skills/report-moments/SKILL.md')
    )
    expect(wrapper.find('button[aria-label="Copied"]').exists()).toBe(true)
  })

  it('needs a name', async () => {
    const fetch = mockFetch(() => json([]))
    const { wrapper } = await mountWithApp(AgentKeys)
    await flushPromises()

    await wrapper.get('form').trigger('submit')

    expect(wrapper.text()).toContain('Give the key a name')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('revokes a key after asking', async () => {
    const fetch = mockFetch((method) => (method === 'DELETE' ? json(null, 204) : json([laptop])))
    const { wrapper } = await mountWithApp(AgentKeys)
    await flushPromises()

    await wrapper.get('button[aria-label="Revoke Laptop"]').trigger('click')
    await wrapper.get('dialog button.bg-rose-600').trigger('click')
    await flushPromises()

    expect(fetch).toHaveBeenCalledWith(
      '/api/tokens/1',
      expect.objectContaining({ method: 'DELETE' })
    )
    expect(wrapper.findAll('li')).toHaveLength(0)
  })
})
