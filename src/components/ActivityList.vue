<script setup lang="ts">
import { X } from '@lucide/vue'
import { format, isSameYear, isToday, isYesterday } from 'date-fns'
import { computed, ref } from 'vue'
import { useTracking } from '../composables/useTracking'
import { dayKey } from '../lib/stats'
import type { Habit, Track } from '../types'
import AppButton from './ui/AppButton.vue'

// The most recent entries, newest first, grouped by day
const { habit } = defineProps<{ habit: Habit }>()
const { untrack } = useTracking()

const PAGE = 25
const limit = ref(PAGE)

const dayLabel = (date: Date) =>
  isToday(date)
    ? 'Today'
    : isYesterday(date)
      ? 'Yesterday'
      : format(date, isSameYear(date, new Date()) ? 'EEEE d MMMM' : 'EEEE d MMMM yyyy')

const groups = computed(() => {
  const result: { key: string; label: string; entries: (Track & { time: string })[] }[] = []
  for (const track of habit.tracks.slice(-limit.value).reverse()) {
    const date = new Date(track.date)
    const key = dayKey(date)
    let group = result.at(-1)
    if (group?.key !== key) result.push((group = { key, label: dayLabel(date), entries: [] }))
    group.entries.push({ ...track, time: format(date, 'HH:mm') })
  }
  return result
})
</script>

<template>
  <div>
    <p v-if="!habit.tracks.length" class="py-6 text-center text-sm text-muted">
      No entries yet. Press + whenever you do it.
    </p>
    <TransitionGroup v-else name="list" tag="div" class="grid gap-5">
      <section v-for="group in groups" :key="group.key">
        <h3 class="mb-1.5 text-xs font-semibold tracking-wide text-muted uppercase">
          {{ group.label }}
          <span class="font-normal normal-case">· {{ group.entries.length }}</span>
        </h3>
        <TransitionGroup name="list" tag="ul" class="grid gap-1">
          <li
            v-for="entry in group.entries"
            :key="entry.id"
            class="group flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-surface-2"
          >
            <span class="size-2 rounded-full bg-habit" aria-hidden="true" />
            <span class="flex-1 text-sm tabular-nums">{{ entry.time }}</span>
            <button
              type="button"
              class="grid size-7 place-items-center rounded-lg text-muted opacity-60 transition hover:bg-surface hover:text-rose-600 hover:opacity-100 focus-visible:opacity-100 disabled:invisible sm:opacity-0 sm:group-hover:opacity-100"
              :aria-label="`Remove the entry at ${entry.time}, ${group.label}`"
              :disabled="entry.id < 0"
              @click="untrack(habit, entry.id)"
            >
              <X class="size-4" aria-hidden="true" />
            </button>
          </li>
        </TransitionGroup>
      </section>
    </TransitionGroup>
    <div v-if="habit.tracks.length > limit" class="mt-4 flex justify-center">
      <AppButton size="sm" @click="limit += PAGE">Show older entries</AppButton>
    </div>
  </div>
</template>
