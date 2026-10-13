<script setup lang="ts">
import { TransitionPresets, usePreferredReducedMotion, useTransition } from '@vueuse/core'
import { computed } from 'vue'

// Counts smoothly from the old value to the new one
const { value, decimals = 0 } = defineProps<{ value: number; decimals?: number }>()

const motion = usePreferredReducedMotion()
const shown = useTransition(() => value, {
  duration: computed(() => (motion.value === 'reduce' ? 0 : 600)),
  transition: TransitionPresets.easeOutCubic
})
const text = computed(() => shown.value.toFixed(decimals))
</script>

<template>
  <span class="tabular-nums">{{ text }}</span>
</template>
