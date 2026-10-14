<script setup lang="ts">
import { useId, useTemplateRef } from 'vue'
import { fieldClass } from './field'

const model = defineModel<string>({ default: '' })
const {
  label,
  type = 'text',
  multiline = false,
  error,
  hint,
  placeholder,
  maxlength,
  autocomplete
} = defineProps<{
  label: string
  type?: string
  multiline?: boolean
  error?: string
  hint?: string
  placeholder?: string
  maxlength?: number
  autocomplete?: string
}>()

const id = useId()
const input = useTemplateRef<HTMLInputElement | HTMLTextAreaElement>('input')
defineExpose({ focus: () => input.value?.focus() })
</script>

<template>
  <div class="grid gap-1.5">
    <label :for="id" class="text-sm font-medium">{{ label }}</label>
    <textarea
      v-if="multiline"
      :id
      ref="input"
      v-model="model"
      rows="3"
      :class="[fieldClass, 'resize-none']"
      :placeholder
      :maxlength
      :aria-invalid="!!error || undefined"
      :aria-describedby="error || hint ? `${id}-note` : undefined"
    />
    <input
      v-else
      :id
      ref="input"
      v-model="model"
      :type
      :class="fieldClass"
      :placeholder
      :maxlength
      :autocomplete
      :aria-invalid="!!error || undefined"
      :aria-describedby="error || hint ? `${id}-note` : undefined"
    />
    <p v-if="error" :id="`${id}-note`" class="text-sm text-rose-600 dark:text-rose-400">
      {{ error }}
    </p>
    <p v-else-if="hint" :id="`${id}-note`" class="text-xs text-muted">{{ hint }}</p>
  </div>
</template>
