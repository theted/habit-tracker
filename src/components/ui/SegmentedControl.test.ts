import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SegmentedControl from './SegmentedControl.vue'

const options = [
  { value: 'a', label: 'One' },
  { value: 'b', label: 'Two' },
  { value: 'c', label: 'Three' }
]

describe('SegmentedControl', () => {
  it('selects by click and by arrow keys, wrapping around', async () => {
    const wrapper = mount(SegmentedControl, {
      props: {
        options,
        label: 'Pick',
        modelValue: 'a',
        'onUpdate:modelValue': (value: string) => wrapper.setProps({ modelValue: value })
      }
    })
    const checked = () => wrapper.get('[aria-checked="true"]').text()

    await wrapper.findAll('button')[1]!.trigger('click')
    expect(checked()).toBe('Two')

    await wrapper.get('[role="radiogroup"]').trigger('keydown', { key: 'ArrowRight' })
    expect(checked()).toBe('Three')
    await wrapper.get('[role="radiogroup"]').trigger('keydown', { key: 'ArrowRight' })
    expect(checked()).toBe('One')
    await wrapper.get('[role="radiogroup"]').trigger('keydown', { key: 'ArrowLeft' })
    expect(checked()).toBe('Three')
  })
})
