<template>
  <div :class="textClass">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  variant: {
    type: String,
    default: 'body'
  }
})

let textClass = ''

switch (props.variant) {
  case 'title':
    textClass = 'text-4xl font-poppins font-semi text-gray-600'
    break
  case 'heading':
    textClass = 'text-2xl font-semibold text-gray-500'
    break
  case 'subheading':
    textClass = 'text-xl text-gray-600'
    break
  default:
    textClass = 'text-base text-gray-800'
    break
}
</script>
