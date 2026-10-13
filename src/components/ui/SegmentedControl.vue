<script setup lang="ts" generic="T extends string">
import { computed, useTemplateRef } from 'vue'

const model = defineModel<T>({ required: true })
const { options, label } = defineProps<{
  options: { value: T; label: string }[]
  label: string
}>()

const index = computed(() =>
  Math.max(
    0,
    options.findIndex((option) => option.value === model.value)
  )
)

const buttons = useTemplateRef<HTMLButtonElement[]>('buttons')

// Arrow keys move the selection, as in any radio group
const move = (step: number) => {
  const next = (index.value + step + options.length) % options.length
  model.value = options[next]!.value
  buttons.value?.[next]?.focus()
}
</script>

<template>
  <div
    role="radiogroup"
    :aria-label="label"
    class="relative grid rounded-xl bg-surface-2 p-1 text-sm"
    :style="{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }"
    @keydown.left.prevent="move(-1)"
    @keydown.right.prevent="move(1)"
  >
    <span
      aria-hidden="true"
      class="absolute inset-y-1 left-1 rounded-lg bg-surface shadow-card transition-transform duration-300 ease-spring"
      :style="{
        width: `calc((100% - 0.5rem) / ${options.length})`,
        transform: `translateX(${index * 100}%)`
      }"
    />
    <button
      v-for="option in options"
      :key="option.value"
      ref="buttons"
      type="button"
      role="radio"
      :aria-checked="option.value === model"
      :tabindex="option.value === model ? 0 : -1"
      class="relative rounded-lg px-3 py-1.5 font-medium whitespace-nowrap transition-colors"
      :class="option.value === model ? 'text-fg' : 'text-muted hover:text-fg'"
      @click="model = option.value"
    >
      {{ option.label }}
    </button>
  </div>
</template>
