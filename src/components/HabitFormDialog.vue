<script setup lang="ts">
import { nextTick, reactive, ref, useTemplateRef, watch } from 'vue'
import { ApiError } from '../api/client'
import { COLOR_NAMES, habitStyle, type HabitColor } from '../lib/colors'
import { useHabitsStore } from '../stores/habits'
import { useToastStore } from '../stores/toasts'
import type { Habit } from '../types'
import AppButton from './ui/AppButton.vue'
import BaseDialog from './ui/BaseDialog.vue'
import TextField from './ui/TextField.vue'

// Creates a habit, or edits the one it is given
const open = defineModel<boolean>('open', { default: false })
const { habit } = defineProps<{ habit?: Habit }>()
const emit = defineEmits<{ saved: [habit: Habit] }>()

const store = useHabitsStore()
const toasts = useToastStore()

type FormState = { title: string; description: string; emoji: string; color: HabitColor }

const EMOJIS = [
  '✨',
  '💧',
  '📚',
  '🏃',
  '🧘',
  '☕',
  '🥗',
  '💤',
  '🏋️',
  '🚶',
  '🎸',
  '✍️',
  '🧹',
  '💊',
  '🦷',
  '🌱',
  '🍎',
  '🚭'
]

const form = reactive<FormState>({ title: '', description: '', emoji: '✨', color: 'violet' })
const error = ref<string>()
const saving = ref(false)
const titleField = useTemplateRef<InstanceType<typeof TextField>>('titleField')

// Fresh fields every time it opens
watch(
  open,
  (isOpen) => {
    if (!isOpen) return
    Object.assign(
      form,
      habit
        ? {
            title: habit.title,
            description: habit.description ?? '',
            emoji: habit.emoji,
            color: habit.color
          }
        : { title: '', description: '', emoji: '✨', color: 'violet' }
    )
    error.value = undefined
    nextTick(() => titleField.value?.focus())
  },
  { immediate: true }
)

// The "needs a name" error goes as soon as there is one
watch(
  () => form.title,
  () => {
    if (form.title.trim()) error.value = undefined
  }
)

const submit = async () => {
  if (!form.title.trim()) {
    error.value = 'Give the habit a name'
    titleField.value?.focus()
    return
  }
  saving.value = true
  try {
    const input = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      emoji: form.emoji,
      color: form.color
    }
    const saved = habit ? await store.update(habit.id, input) : await store.create(input)
    toasts.show(habit ? 'Changes saved' : `${saved.emoji} ${saved.title} created`)
    emit('saved', saved)
    open.value = false
  } catch (err) {
    if (err instanceof ApiError && err.issues.some((issue) => issue.path === 'title')) {
      error.value = err.message
    } else {
      toasts.error(err, "Couldn't save the habit")
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BaseDialog
    v-model:open="open"
    :title="habit ? 'Edit habit' : 'New habit'"
    :description="habit ? undefined : 'Something to do more of, or less of.'"
  >
    <form class="grid gap-5" :style="habitStyle(form.color)" novalidate @submit.prevent="submit">
      <div class="flex items-start gap-3">
        <span
          class="mt-6 grid size-11 shrink-0 place-items-center rounded-xl bg-habit/15 text-2xl transition-colors duration-300"
          aria-hidden="true"
        >
          {{ form.emoji }}
        </span>
        <TextField
          ref="titleField"
          v-model="form.title"
          class="flex-1"
          label="Name"
          placeholder="Drink water, read, run…"
          :maxlength="60"
          :error
          autocomplete="off"
        />
      </div>

      <fieldset>
        <legend class="text-sm font-medium">Icon</legend>
        <div class="mt-2 grid grid-cols-9 gap-1" role="radiogroup" aria-label="Icon">
          <button
            v-for="emoji in EMOJIS"
            :key="emoji"
            type="button"
            role="radio"
            :aria-checked="form.emoji === emoji"
            :aria-label="emoji"
            class="grid aspect-square place-items-center rounded-lg text-xl transition hover:bg-surface-2"
            :class="form.emoji === emoji && 'bg-habit/15 ring-2 ring-habit'"
            @click="form.emoji = emoji"
          >
            {{ emoji }}
          </button>
        </div>
      </fieldset>

      <fieldset>
        <legend class="text-sm font-medium">Colour</legend>
        <div class="mt-2 flex flex-wrap gap-2.5" role="radiogroup" aria-label="Colour">
          <button
            v-for="color in COLOR_NAMES"
            :key="color"
            type="button"
            role="radio"
            :aria-checked="form.color === color"
            :aria-label="color"
            class="size-8 rounded-full bg-habit transition duration-200 ease-spring hover:scale-110"
            :class="
              form.color === color &&
              'scale-110 ring-2 ring-habit ring-offset-2 ring-offset-surface'
            "
            :style="habitStyle(color)"
            @click="form.color = color"
          />
        </div>
      </fieldset>

      <TextField
        v-model="form.description"
        label="Description"
        multiline
        placeholder="Optional"
        :maxlength="280"
      />

      <div class="flex justify-end gap-2 pt-1">
        <AppButton @click="open = false">Cancel</AppButton>
        <AppButton type="submit" variant="primary" :loading="saving">
          {{ habit ? 'Save changes' : 'Create habit' }}
        </AppButton>
      </div>
    </form>
  </BaseDialog>
</template>
