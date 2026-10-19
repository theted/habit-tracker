<script setup lang="ts">
import {
  ArrowLeft,
  CalendarDays,
  CalendarRange,
  Flame,
  Gauge,
  Pencil,
  Sigma,
  Trash2,
  Trophy
} from '@lucide/vue'
import { format } from 'date-fns'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useHabitStats } from '../composables/useHabitStats'
import { useTracking } from '../composables/useTracking'
import { habitStyle } from '../lib/colors'
import { byHour, byMonth, byWeekday, lastDays, peak } from '../lib/stats'
import { useHabitsStore } from '../stores/habits'
import { useToastStore } from '../stores/toasts'
import type { Habit } from '../types'
import ActivityList from './ActivityList.vue'
import BarChart from './BarChart.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import HabitFormDialog from './HabitFormDialog.vue'
import HabitRhythm from './HabitRhythm.vue'
import HabitTiming from './HabitTiming.vue'
import HeatmapGrid from './HeatmapGrid.vue'
import LogPastEntry from './LogPastEntry.vue'
import StatTile from './StatTile.vue'
import TrackButton from './TrackButton.vue'
import AppButton from './ui/AppButton.vue'
import SegmentedControl from './ui/SegmentedControl.vue'

const { habit } = defineProps<{ habit: Habit }>()

const store = useHabitsStore()
const toasts = useToastStore()
const router = useRouter()
const { summary, dates, days, now } = useHabitStats(() => habit)
const { track } = useTracking()

const entries = (count: number) => (count === 1 ? '1 entry' : `${count} entries`)

const since = computed(() => {
  const first = habit.tracks[0]
  const created = new Date(habit.createdAt)
  return first && new Date(first.date) < created ? new Date(first.date) : created
})

type Mode = 'days' | 'hour' | 'weekday' | 'month'
const mode = ref<Mode>('days')
const modes: { value: Mode; label: string }[] = [
  { value: 'days', label: '30 days' },
  { value: 'hour', label: 'Time of day' },
  { value: 'weekday', label: 'Weekday' },
  { value: 'month', label: 'Month' }
]

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]
const hh = (hour: number) => String(hour % 24).padStart(2, '0')

const chart = computed(() => {
  switch (mode.value) {
    case 'days': {
      const month = lastDays(days.value, 30, now.value)
      const values = month.map((day) => day.count)
      const active = values.filter(Boolean).length
      const most = Math.max(...values)
      return {
        values,
        // Counted back from today, so today always has its label
        labels: month.map((day, i) =>
          i === month.length - 1
            ? 'Today'
            : (month.length - 1 - i) % 7 === 0
              ? format(day.date, 'd MMM')
              : ''
        ),
        tooltips: month.map((day) => format(day.date, 'EEE d MMM')),
        highlight: values.length - 1,
        tickEvery: 1,
        insight: active
          ? `On ${active} of the last 30 days · ${entries(summary.value.last30)}` +
            (most > 1 ? `, up to ${most} a day` : '')
          : 'Nothing logged in the last 30 days'
      }
    }
    case 'hour': {
      const values = byHour(dates.value)
      const top = peak(values)
      return {
        values,
        labels: values.map((_, hour) => hh(hour)),
        tooltips: values.map((_, hour) => `${hh(hour)}:00–${hh(hour)}:59`),
        highlight: top,
        tickEvery: 3,
        insight:
          top === undefined
            ? 'No entries yet'
            : `Most often between ${hh(top)}:00 and ${hh(top + 1)}:00`
      }
    }
    case 'weekday': {
      const values = byWeekday(dates.value)
      const top = peak(values)
      return {
        values,
        labels: WEEKDAYS.map((day) => day.slice(0, 3)),
        tooltips: WEEKDAYS,
        highlight: top,
        tickEvery: 1,
        insight: top === undefined ? 'No entries yet' : `Busiest on ${WEEKDAYS[top]}s`
      }
    }
    case 'month': {
      const values = byMonth(dates.value)
      const top = peak(values)
      return {
        values,
        labels: MONTHS.map((month) => month.slice(0, 3)),
        tooltips: MONTHS,
        highlight: top,
        tickEvery: 1,
        insight: top === undefined ? 'No entries yet' : `Busiest in ${MONTHS[top]}`
      }
    }
  }
  throw new Error(`Unknown chart mode ${mode.value satisfies never}`)
})

const editing = ref(false)
const deleting = ref(false)
const deleteBusy = ref(false)

const remove = async () => {
  deleteBusy.value = true
  try {
    await store.remove(habit.id)
    deleting.value = false
    toasts.show(`${habit.emoji} ${habit.title} deleted`)
    await router.push({ name: 'home' })
  } catch (err) {
    toasts.error(err, "Couldn't delete the habit")
  } finally {
    deleteBusy.value = false
  }
}

const deleteMessage = computed(() => {
  const total = summary.value.total
  const what =
    total === 0
      ? 'the habit'
      : total === 1
        ? 'the habit and its one entry'
        : `the habit and all ${total} of its entries`
  return `This removes ${what}. It can't be undone.`
})
</script>

<template>
  <div
    class="mx-auto grid max-w-5xl gap-5 px-4 py-8 sm:px-6 sm:py-10"
    :style="habitStyle(habit.color)"
  >
    <RouterLink
      to="/"
      class="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted transition hover:text-fg"
    >
      <ArrowLeft class="size-4" aria-hidden="true" /> All habits
    </RouterLink>

    <header
      class="relative overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-card sm:p-8"
    >
      <div
        class="pointer-events-none absolute -top-28 -right-20 size-80 rounded-full bg-habit/20 blur-3xl"
        aria-hidden="true"
      />
      <!-- On a phone the actions get a row of their own under the title -->
      <div class="relative grid gap-5 sm:flex sm:items-center">
        <div class="flex min-w-0 flex-1 items-center gap-4 sm:gap-5">
          <span
            class="grid size-14 shrink-0 place-items-center rounded-2xl bg-habit/15 text-3xl sm:size-16 sm:text-4xl"
          >
            {{ habit.emoji }}
          </span>
          <div class="min-w-0">
            <h1 class="text-2xl font-semibold tracking-tight break-words sm:text-3xl">
              {{ habit.title }}
            </h1>
            <p v-if="habit.description" class="mt-1 text-muted">{{ habit.description }}</p>
            <p class="mt-1 text-sm text-muted">Since {{ format(since, 'd MMMM yyyy') }}</p>
          </div>
        </div>
        <div class="flex items-center justify-end gap-1">
          <AppButton variant="ghost" size="icon" aria-label="Edit habit" @click="editing = true">
            <Pencil aria-hidden="true" />
          </AppButton>
          <AppButton
            variant="ghost"
            size="icon"
            aria-label="Delete habit"
            class="hover:text-rose-600"
            @click="deleting = true"
          >
            <Trash2 aria-hidden="true" />
          </AppButton>
          <TrackButton
            class="ml-2"
            size="lg"
            :color="habit.color"
            :label="`Log ${habit.title}`"
            @track="track(habit)"
          />
        </div>
      </div>
    </header>

    <section aria-label="Statistics" class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <StatTile label="Today" :value="summary.today" :icon="CalendarDays" />
      <StatTile
        label="Streak"
        :value="summary.currentStreak"
        :unit="summary.currentStreak === 1 ? 'day' : 'days'"
        :icon="Flame"
      />
      <StatTile
        label="Best streak"
        :value="summary.bestStreak"
        :unit="summary.bestStreak === 1 ? 'day' : 'days'"
        :icon="Trophy"
      />
      <StatTile label="Last 7 days" :value="summary.last7" :icon="CalendarRange" />
      <StatTile label="Per day" :value="summary.dailyAverage" :decimals="1" :icon="Gauge" />
      <StatTile label="All time" :value="summary.total" :icon="Sigma" />
    </section>

    <section class="rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-6">
      <header class="mb-4">
        <h2 class="font-semibold">The past year</h2>
        <p class="text-sm text-muted">Every square is a day, darker for more entries.</p>
      </header>
      <HeatmapGrid :days :now />
    </section>

    <section class="rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-6">
      <header class="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 class="font-semibold">Patterns</h2>
          <Transition mode="out-in" name="page">
            <p :key="chart.insight" class="text-sm text-muted">{{ chart.insight }}</p>
          </Transition>
        </div>
        <SegmentedControl v-model="mode" :options="modes" label="Chart" />
      </header>
      <BarChart
        :key="mode"
        :values="chart.values"
        :labels="chart.labels"
        :tooltips="chart.tooltips"
        :highlight="chart.highlight"
        :tick-every="chart.tickEvery"
        :label="`${modes.find((m) => m.value === mode)!.label}: ${chart.insight}`"
      />
    </section>

    <HabitTiming :dates :now />
    <HabitRhythm :dates :now />

    <section class="rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-6">
      <header class="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 class="font-semibold">Entries</h2>
          <p class="text-sm text-muted">{{ entries(summary.total) }} in all</p>
        </div>
        <LogPastEntry :habit />
      </header>
      <ActivityList :habit />
    </section>

    <HabitFormDialog v-model:open="editing" :habit />
    <ConfirmDialog
      v-model:open="deleting"
      :title="`Delete ${habit.title}?`"
      :message="deleteMessage"
      confirm-label="Delete habit"
      :busy="deleteBusy"
      @confirm="remove"
    />
  </div>
</template>
