<script setup lang="ts">
import type { Component } from 'vue'
import AnimatedNumber from './ui/AnimatedNumber.vue'

const {
  label,
  value,
  decimals = 0,
  unit,
  icon
} = defineProps<{
  label: string
  value: number
  decimals?: number
  unit?: string
  icon?: Component
}>()
</script>

<template>
  <div class="rounded-2xl border border-line bg-surface p-4 shadow-card">
    <p class="flex items-center gap-1.5 text-xs font-medium text-muted">
      <component :is="icon" v-if="icon" class="size-3.5 text-habit" aria-hidden="true" />
      {{ label }}
    </p>
    <p class="mt-2 text-2xl font-semibold tracking-tight">
      <AnimatedNumber :value :decimals />
      <span v-if="unit" class="ml-1 text-sm font-medium text-muted">{{ unit }}</span>
    </p>
  </div>
</template>
