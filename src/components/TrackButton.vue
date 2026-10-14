<script setup lang="ts">
import { Plus } from '@lucide/vue'
import { usePreferredReducedMotion } from '@vueuse/core'
import { useTemplateRef } from 'vue'
import { inkClass } from '../lib/colors'

const {
  label,
  color,
  size = 'md'
} = defineProps<{
  label: string
  color: string
  size?: 'md' | 'lg'
}>()
const emit = defineEmits<{ track: [] }>()

const button = useTemplateRef<HTMLButtonElement>('button')
const motion = usePreferredReducedMotion()

// A pop and a ripple on every press. The Web Animations API restarts cleanly on rapid taps,
// which toggling a CSS class doesn't.
const onClick = () => {
  emit('track')
  if (motion.value === 'reduce' || typeof button.value?.animate !== 'function') return
  button.value.animate(
    [
      {
        transform: 'scale(1)',
        boxShadow: '0 0 0 0 color-mix(in oklch, var(--habit) 55%, transparent)'
      },
      { transform: 'scale(1.16)', offset: 0.3 },
      { transform: 'scale(1)', boxShadow: '0 0 0 18px transparent' }
    ],
    { duration: 550, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }
  )
}
</script>

<template>
  <button
    ref="button"
    type="button"
    :aria-label="label"
    class="grid shrink-0 place-items-center rounded-full bg-habit shadow-card transition-[filter,transform] duration-150 hover:brightness-110 active:scale-95"
    :class="[inkClass(color), size === 'lg' ? 'size-14' : 'size-11']"
    @click="onClick"
  >
    <Plus :class="size === 'lg' ? 'size-7' : 'size-5'" :stroke-width="2.5" aria-hidden="true" />
  </button>
</template>
