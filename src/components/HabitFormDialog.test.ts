import { describe, expect, it } from 'vitest'
import { useHabitsStore } from '../stores/habits'
import { useToastStore } from '../stores/toasts'
import { flushPromises, json, makeHabit, mockFetch, mountWithApp } from '../test/utils'
import HabitFormDialog from './HabitFormDialog.vue'

describe('HabitFormDialog', () => {
  it('opens as a modal dialog with the name field focused', async () => {
    const { wrapper } = await mountWithApp(HabitFormDialog, { open: true })
    await flushPromises()

    expect(wrapper.get('dialog').element.open).toBe(true)
    expect(document.activeElement).toBe(wrapper.get('input').element)
  })

  it('asks for a name instead of sending an empty one', async () => {
    const fetch = mockFetch(() => json({}))
    const { wrapper } = await mountWithApp(HabitFormDialog, { open: true })

    await wrapper.get('form').trigger('submit')

    expect(wrapper.text()).toContain('Give the habit a name')
    expect(wrapper.get('input').attributes('aria-invalid')).toBe('true')
    expect(fetch).not.toHaveBeenCalled()

    await wrapper.get('input').setValue('R')
    expect(wrapper.text()).not.toContain('Give the habit a name')
  })

  it('creates a habit with the chosen name, icon and colour', async () => {
    const fetch = mockFetch((_method, _url, body) =>
      json({ ...makeHabit(), ...(body as object) }, 201)
    )
    const { wrapper } = await mountWithApp(HabitFormDialog, { open: true })

    await wrapper.get('input').setValue('  Run  ')
    // jsdom's selector engine can't match an emoji in an attribute selector
    const icon = wrapper
      .findAll('button')
      .find((button) => button.attributes('aria-label') === '🏃')
    await icon!.trigger('click')
    await wrapper.get('button[aria-label="emerald"]').trigger('click')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(fetch.mock.calls[0]![1]).toMatchObject({ method: 'POST' })
    expect(JSON.parse(String(fetch.mock.calls[0]![1]!.body))).toEqual({
      title: 'Run',
      description: null,
      emoji: '🏃',
      color: 'emerald'
    })
    expect(useHabitsStore().habits.map((habit) => habit.title)).toEqual(['Run'])
    expect(useToastStore().toasts[0]!.message).toBe('🏃 Run created')
    expect(wrapper.emitted('saved')).toHaveLength(1)
    expect(wrapper.emitted('update:open')).toEqual([[false]])
  })

  it('edits an existing habit', async () => {
    const habit = makeHabit({ title: 'Read', description: 'Before bed', color: 'sky' })
    const fetch = mockFetch((_method, _url, body) => json({ ...habit, ...(body as object) }))
    const { wrapper } = await mountWithApp(HabitFormDialog, { open: true, habit })
    useHabitsStore().habits = [habit]

    expect(wrapper.get('h2').text()).toBe('Edit habit')
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('Read')
    expect(wrapper.get('button[aria-label="sky"]').attributes('aria-checked')).toBe('true')

    await wrapper.get('input').setValue('Read more')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(fetch).toHaveBeenCalledWith(
      `/api/habits/${habit.id}`,
      expect.objectContaining({ method: 'PATCH' })
    )
    expect(useHabitsStore().habits[0]!.title).toBe('Read more')
    expect(useToastStore().toasts[0]!.message).toBe('Changes saved')
  })

  it('shows a name the server rejects next to the field', async () => {
    mockFetch(() =>
      json({ error: 'Bad Request', issues: [{ path: 'title', message: 'Too long' }] }, 400)
    )
    const { wrapper } = await mountWithApp(HabitFormDialog, { open: true })

    await wrapper.get('input').setValue('Read')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Too long')
    expect(wrapper.emitted('update:open')).toBeUndefined()
  })
})
