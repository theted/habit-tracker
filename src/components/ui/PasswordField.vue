<script setup lang="ts">
import { Eye, EyeOff } from '@lucide/vue'
import { ref, useId, useTemplateRef } from 'vue'
import { fieldClass } from './field'

// A password input with a button to show what was typed, which beats a "repeat password" field
const model = defineModel<string>({ default: '' })
const { label, autocomplete, error, hint } = defineProps<{
  label: string
  // current-password or new-password, so password managers know what to do
  autocomplete: 'current-password' | 'new-password'
  error?: string
  hint?: string
}>()

const id = useId()
const visible = ref(false)
const input = useTemplateRef<HTMLInputElement>('input')
defineExpose({ focus: () => input.value?.focus() })
</script>

<template>
  <div class="grid gap-1.5">
    <label :for="id" class="text-sm font-medium">{{ label }}</label>
    <div class="relative">
      <input
        :id
        ref="input"
        v-model="model"
        :type="visible ? 'text' : 'password'"
        :autocomplete
        autocapitalize="off"
        spellcheck="false"
        :class="[fieldClass, 'pr-11']"
        :aria-invalid="!!error || undefined"
        :aria-describedby="error || hint ? `${id}-note` : undefined"
      />
      <button
        type="button"
        class="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-muted transition hover:text-fg"
        :aria-label="visible ? 'Hide password' : 'Show password'"
        :aria-pressed="visible"
        @click="visible = !visible"
      >
        <EyeOff v-if="visible" class="size-4" aria-hidden="true" />
        <Eye v-else class="size-4" aria-hidden="true" />
      </button>
    </div>
    <p v-if="error" :id="`${id}-note`" class="text-sm text-rose-600 dark:text-rose-400">
      {{ error }}
    </p>
    <p v-else-if="hint" :id="`${id}-note`" class="text-xs text-muted">{{ hint }}</p>
  </div>
</template>
