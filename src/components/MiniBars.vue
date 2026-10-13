<script setup lang="ts">
import { computed } from 'vue'

// A small bar per day; the last one is today
const { values, label } = defineProps<{ values: number[]; label: string }>()
const max = computed(() => Math.max(1, ...values))
</script>

<template>
  <div class="flex h-10 items-end gap-1" role="img" :aria-label="label">
    <span
      v-for="(value, i) in values"
      :key="i"
      class="flex-1 rounded-[3px] transition-[height,background-color] duration-500 ease-spring"
      :class="value ? (i === values.length - 1 ? 'bg-habit' : 'bg-habit/45') : 'bg-line'"
      :style="{ height: value ? `${Math.max(15, (value / max) * 100)}%` : '3px' }"
    />
  </div>
</template>
