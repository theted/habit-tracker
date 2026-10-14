<script setup lang="ts">
import { Plus, RotateCw, Sprout } from '@lucide/vue'
import { format } from 'date-fns'
import { computed, onMounted, ref } from 'vue'
import HabitCard from '../components/HabitCard.vue'
import HabitFormDialog from '../components/HabitFormDialog.vue'
import AppButton from '../components/ui/AppButton.vue'
import { useMinuteClock } from '../composables/useMinuteClock'
import { dayKey } from '../lib/stats'
import { useHabitsStore } from '../stores/habits'
import { useSessionStore } from '../stores/session'
import { useToastStore } from '../stores/toasts'

const store = useHabitsStore()
const session = useSessionStore()
const toasts = useToastStore()
const creating = ref(false)

const load = () => store.load().catch((err) => toasts.error(err, "Couldn't load your habits"))
onMounted(() => {
  if (store.status === 'idle') load()
})

const now = useMinuteClock()
const greeting = computed(() => {
  const hour = now.value.getHours()
  const time =
    hour < 5
      ? 'Good night'
      : hour < 12
        ? 'Good morning'
        : hour < 18
          ? 'Good afternoon'
          : 'Good evening'
  const name = session.user?.username
  return name ? `${time}, ${name.charAt(0).toUpperCase()}${name.slice(1)}` : time
})

const today = computed(() => {
  const key = dayKey(now.value)
  const counts = store.habits.map(
    (habit) => habit.tracks.filter((track) => dayKey(new Date(track.date)) === key).length
  )
  return {
    done: counts.filter(Boolean).length,
    entries: counts.reduce((sum, count) => sum + count, 0)
  }
})
const progress = computed(() =>
  store.habits.length ? (today.value.done / store.habits.length) * 100 : 0
)
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-sm font-medium text-muted">{{ format(now, 'EEEE d MMMM') }}</p>
        <h1 class="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{{ greeting }}</h1>
        <p v-if="store.habits.length" class="mt-2 text-muted">
          {{ today.done }} of {{ store.habits.length }} habits checked off today ·
          {{ today.entries === 1 ? '1 entry' : `${today.entries} entries` }}
        </p>
      </div>
      <AppButton v-if="store.habits.length" variant="primary" @click="creating = true">
        <Plus aria-hidden="true" /> New habit
      </AppButton>
    </div>

    <div
      v-if="store.habits.length"
      class="mt-6 h-1.5 overflow-hidden rounded-full bg-surface-2"
      role="progressbar"
      :aria-valuenow="today.done"
      aria-valuemin="0"
      :aria-valuemax="store.habits.length"
      aria-label="Habits checked off today"
    >
      <div
        class="h-full rounded-full bg-linear-to-r from-violet-500 to-fuchsia-500 transition-[width] duration-700 ease-spring"
        :style="{ width: `${progress}%` }"
      />
    </div>

    <div
      v-if="store.status === 'idle' || store.status === 'loading'"
      class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      aria-busy="true"
    >
      <div v-for="i in 3" :key="i" class="h-44 animate-pulse rounded-2xl bg-surface-2" />
    </div>

    <div
      v-else-if="store.status === 'error' && !store.habits.length"
      class="mt-10 grid justify-items-center gap-4 rounded-3xl border border-dashed border-line px-6 py-14 text-center"
    >
      <p class="text-muted">Your habits couldn't be loaded.</p>
      <AppButton @click="load"><RotateCw aria-hidden="true" /> Try again</AppButton>
    </div>

    <div
      v-else-if="!store.habits.length"
      class="mt-10 grid justify-items-center gap-4 rounded-3xl border border-dashed border-line px-6 py-16 text-center"
    >
      <span
        class="grid size-16 place-items-center rounded-2xl bg-linear-to-br from-violet-500/15 to-fuchsia-500/15 text-violet-500"
      >
        <Sprout class="size-8" aria-hidden="true" />
      </span>
      <div>
        <h2 class="text-lg font-semibold">Start your first habit</h2>
        <p class="mt-1 max-w-sm text-muted">
          Pick something small: a glass of water, ten pages, a walk. Then tap + every time you do
          it.
        </p>
      </div>
      <AppButton variant="primary" @click="creating = true">
        <Plus aria-hidden="true" /> New habit
      </AppButton>
    </div>

    <TransitionGroup
      v-else
      name="list"
      tag="div"
      appear
      class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <HabitCard v-for="(habit, i) in store.habits" :key="habit.id" :habit :style="{ '--i': i }" />
    </TransitionGroup>

    <HabitFormDialog v-model:open="creating" />
  </div>
</template>
