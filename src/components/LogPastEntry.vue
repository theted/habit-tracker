<script setup lang="ts">
import { CalendarPlus } from '@lucide/vue'
import { format } from 'date-fns'
import { ref, useId } from 'vue'
import { useHabitsStore } from '../stores/habits'
import { useToastStore } from '../stores/toasts'
import type { Habit } from '../types'
import AppButton from './ui/AppButton.vue'

// For the check-in that was forgotten at the time
const { habit } = defineProps<{ habit: Habit }>()
const store = useHabitsStore()
const toasts = useToastStore()
const id = useId()

const LOCAL = "yyyy-MM-dd'T'HH:mm"
const value = ref(format(new Date(), LOCAL))
const saving = ref(false)

const submit = async () => {
  // datetime-local values carry no zone, and new Date() reads them as local time
  const date = new Date(value.value)
  if (Number.isNaN(date.getTime())) return
  saving.value = true
  try {
    const saved = await store.track(habit.id, date)
    toasts.show(`Logged for ${format(date, 'EEE d MMM, HH:mm')}`, {
      action: { label: 'Undo', run: () => store.untrack(habit.id, saved.id) }
    })
  } catch (err) {
    toasts.error(err, "Couldn't log the entry")
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="flex flex-wrap items-end gap-2" @submit.prevent="submit">
    <div class="grid gap-1">
      <label :for="id" class="text-xs font-medium text-muted">Log an earlier entry</label>
      <input
        :id
        v-model="value"
        type="datetime-local"
        required
        :max="format(new Date(), LOCAL)"
        class="h-9 rounded-xl border border-line bg-surface px-3 text-sm shadow-xs focus-visible:border-habit focus-visible:ring-4 focus-visible:ring-habit/15 focus-visible:outline-none"
      />
    </div>
    <AppButton type="submit" size="sm" :loading="saving">
      <CalendarPlus aria-hidden="true" /> Add
    </AppButton>
  </form>
</template>
