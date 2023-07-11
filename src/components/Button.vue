<template>
  <button
    :class="[
      'px-6 py-3 rounded-full font-semibold',
      'w-full inline-flex justify-center rounded-md',
      'border border-transparent shadow-sm',
      'text-base font-medium text-white  focus:outline-none',
      'sm:mt-0 sm:w-auto sm:text-sm',
      buttonClass,
      loading ? 'bg-gray-200 text-gray-700 cursor-not-allowed' : 'text-white',
      disabled ? 'opacity-50 cursor-not-allowed' : 'opacity-100'
    ]"
    :disabled="disabled || loading"
  >
    <slot></slot>
  </button>
</template>

<script setup lang="ts">
const props = defineProps({
  disabled: Boolean,
  loading: Boolean,
  variant: 'default' | 'success' | 'warn' | 'error' | 'danger'
})


let buttonClass = ''

switch (props.variant) {
  default:
  case 'default':
    buttonClass = 'bg-blue-600 hover:bg-blue-500'
    break
  case 'success':
    buttonClass = 'bg-green-600 hover:bg-green-500'
    break
  case 'warn':
    buttonClass = 'bg-yellow-600'
    break
  case 'error':
  case 'danger':
    buttonClass = 'bg-red-600 hover:bg-red-500'
    break
}
</script>
