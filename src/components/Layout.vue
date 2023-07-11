<template>
  <div :class="['grid', 'grid-cols-' + props.columns, 'gap-6 items-center']">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  columns: {
    type: Number,
    default: 2
  }
})
</script>
