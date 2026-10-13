<script setup lang="ts">
import { useId, useTemplateRef } from 'vue'

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

const fieldClass =
  'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm shadow-xs transition ' +
  'placeholder:text-muted/70 focus-visible:border-habit focus-visible:ring-4 focus-visible:ring-habit/15 ' +
  'focus-visible:outline-none aria-invalid:border-rose-500 aria-invalid:ring-rose-500/15'
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
