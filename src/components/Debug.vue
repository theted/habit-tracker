<template>
  <div class="p-6 border border-gray-200 max-w-full">
    <p class="uppercase text-right relative top-5 pr-3 text-xs text-gray-500">{{ label }}</p>
    <code>
      <pre
        class="text-sm bg-slate-300 p-3 border border-gray-300 break-words overflow-scroll max-h-72"
        >{{ JSON.stringify(data, null, 2) }}</pre
      >
    </code>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  data: any
  label?: string
}>()
</script>
