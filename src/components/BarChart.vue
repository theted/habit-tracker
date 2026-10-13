<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

const {
  values,
  labels,
  tooltips,
  highlight,
  tickEvery = 1,
  label
} = defineProps<{
  values: number[]
  // Under the bars; every tickEvery-th one is shown
  labels: string[]
  // On hover; the labels when not given
  tooltips?: string[]
  highlight?: number
  tickEvery?: number
  label: string
}>()

const max = computed(() => Math.max(1, ...values))
const active = ref<number>()

// Bars start flat and grow in once mounted
const grown = ref(false)
onMounted(() => requestAnimationFrame(() => (grown.value = true)))

const height = (value: number) =>
  grown.value && value ? `${Math.max(3, (value / max.value) * 100)}%` : '2px'
</script>

<template>
  <figure class="grid gap-2">
    <div class="relative h-44">
      <span class="absolute -top-1 left-0 text-[11px] text-muted tabular-nums">{{ max }}</span>
      <div class="absolute inset-x-0 top-0 border-t border-dashed border-line" aria-hidden="true" />
      <div
        class="relative flex h-full items-end gap-[3px] pt-4 sm:gap-1"
        role="img"
        :aria-label="label"
      >
        <div
          v-for="(value, i) in values"
          :key="i"
          class="relative flex h-full flex-1 items-end"
          data-bar
          @mouseenter="active = i"
          @mouseleave="active = undefined"
        >
          <div
            class="w-full rounded-t-[5px] transition-[height,background-color] duration-700 ease-spring"
            :class="
              value === 0
                ? 'bg-line'
                : i === highlight
                  ? 'bg-habit'
                  : active === i
                    ? 'bg-habit/80'
                    : 'bg-habit/50'
            "
            :style="{ height: height(value), transitionDelay: grown ? '0ms' : `${i * 12}ms` }"
          />
          <Transition
            enter-from-class="opacity-0 translate-y-1"
            leave-to-class="opacity-0"
            enter-active-class="transition duration-150"
            leave-active-class="transition duration-100"
          >
            <span
              v-if="active === i"
              class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 rounded-lg bg-fg px-2 py-1 text-xs font-medium whitespace-nowrap text-bg shadow-lifted"
            >
              {{ (tooltips ?? labels)[i] }} · {{ value }}
            </span>
          </Transition>
        </div>
      </div>
    </div>
    <div class="flex gap-[3px] text-[11px] text-muted sm:gap-1" aria-hidden="true">
      <span v-for="(tick, i) in labels" :key="i" class="flex-1 text-center whitespace-nowrap">
        {{ i % tickEvery === 0 ? tick : '' }}
      </span>
    </div>
  </figure>
</template>
