<script setup lang="ts">
import { LoaderCircle } from '@lucide/vue'
import { buttonClass, type ButtonSize, type ButtonVariant } from './button'

// type defaults to "button": a bare <button> inside a form submits it
const {
  variant = 'secondary',
  size = 'md',
  type = 'button',
  loading = false,
  disabled = false
} = defineProps<{
  variant?: ButtonVariant
  size?: ButtonSize
  type?: 'button' | 'submit' | 'reset'
  loading?: boolean
  disabled?: boolean
}>()
</script>

<template>
  <button
    :type
    :class="buttonClass(variant, size)"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
  >
    <LoaderCircle v-if="loading" class="animate-spin" aria-hidden="true" />
    <slot />
  </button>
</template>
