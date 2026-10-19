<script setup lang="ts">
import { Check } from '@lucide/vue'
import { computed } from 'vue'
import { habitStyle } from '../lib/colors'
import { dayKey } from '../lib/stats'
import {
  DAY_MINUTES,
  dayOrder,
  formatAround,
  minuteOfDay,
  usualTime,
  type UsualTime
} from '../lib/timing'
import type { Habit } from '../types'

// A typical day: every habit with a usual time, in the order they come, each with the window that
// two thirds of its entries fall in, and a line for now
const { habits, now } = defineProps<{ habits: Habit[]; now: Date }>()

interface Row {
  habit: Habit
  usual: UsualTime
  done: boolean
  // The window as stretches of the 00–24 track, in percent; split in two if it passes midnight
  bars: { left: number; width: number }[]
}

const percent = (minute: number) => (minute / DAY_MINUTES) * 100

const rows = computed(() => {
  const today = dayKey(now)
  const result: Row[] = []
  for (const habit of habits) {
    const dates = habit.tracks.map((track) => new Date(track.date))
    const usual = usualTime(dates, now)
    if (!usual) continue
    const end = usual.from + usual.width
    const bars =
      end <= DAY_MINUTES
        ? [{ left: percent(usual.from), width: percent(usual.width) }]
        : [
            { left: percent(usual.from), width: 100 - percent(usual.from) },
            { left: 0, width: percent(end - DAY_MINUTES) }
          ]
    result.push({ habit, usual, done: dates.some((date) => dayKey(date) === today), bars })
  }
  // Habits without a particular time go last
  return result.sort(
    (a, b) =>
      Number(a.usual.anyTime) - Number(b.usual.anyTime) ||
      dayOrder(a.usual.minute) - dayOrder(b.usual.minute)
  )
})

const nowAt = computed(() => percent(minuteOfDay(now)))

const insight = computed(() => {
  const order = dayOrder(minuteOfDay(now))
  const timed = rows.value.filter((row) => !row.usual.anyTime)
  const next = timed.find((row) => !row.done && dayOrder(row.usual.minute) > order)
  if (next) {
    return `Next up: ${next.habit.emoji} ${next.habit.title}, usually around ${formatAround(next.usual.minute)}`
  }
  if (timed.length && timed.every((row) => row.done))
    return 'Everything with a usual time is done today'
  return 'Your habits at the time of day you usually do them'
})

const TICKS = [0, 6, 12, 18, 24]
</script>

<template>
  <section
    v-if="rows.length"
    class="rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-6"
    aria-labelledby="typical-day"
  >
    <header class="mb-5">
      <h2 id="typical-day" class="font-semibold">Your day</h2>
      <p class="text-sm text-muted" data-insight>{{ insight }}</p>
    </header>

    <!-- --label and --time are the outer columns; the overlay lines are placed across the middle -->
    <div class="relative [--label:6.5rem] [--time:4rem] sm:[--label:11rem]">
      <div
        class="pointer-events-none absolute inset-y-0"
        :style="{
          left: 'calc(var(--label) + 0.75rem)',
          right: 'calc(var(--time) + 0.75rem)'
        }"
        aria-hidden="true"
      >
        <span
          v-for="hour in TICKS"
          :key="hour"
          class="absolute top-0 bottom-5 w-px bg-line"
          :style="{ left: `${(hour / 24) * 100}%` }"
        />
        <span
          v-for="hour in TICKS"
          :key="`label-${hour}`"
          class="absolute bottom-0 text-[10px] text-muted tabular-nums"
          :class="hour === 0 ? '' : hour === 24 ? '-translate-x-full' : '-translate-x-1/2'"
          :style="{ left: `${(hour / 24) * 100}%` }"
        >
          {{ String(hour).padStart(2, '0') }}
        </span>
        <span
          class="absolute -top-1 bottom-5 w-0.5 rounded-full bg-fg/70"
          :style="{ left: `${nowAt}%` }"
        >
          <span
            class="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-fg px-1.5 text-[10px] font-medium text-bg"
          >
            Now
          </span>
        </span>
      </div>

      <ul class="relative grid gap-1 pt-4 pb-6">
        <li
          v-for="row in rows"
          :key="row.habit.id"
          class="grid h-9 grid-cols-[var(--label)_1fr_var(--time)] items-center gap-x-3"
          :style="habitStyle(row.habit.color)"
          data-row
        >
          <RouterLink
            :to="{ name: 'habit', params: { id: row.habit.id } }"
            class="flex min-w-0 items-center gap-2 rounded-lg text-sm font-medium transition hover:text-habit"
          >
            <span aria-hidden="true">{{ row.habit.emoji }}</span>
            <span class="truncate">{{ row.habit.title }}</span>
            <template v-if="row.done">
              <Check class="size-3.5 shrink-0 text-muted" :stroke-width="3" aria-hidden="true" />
              <span class="sr-only">, done today</span>
            </template>
          </RouterLink>
          <span class="relative h-2 rounded-full bg-surface-2" aria-hidden="true">
            <span
              v-for="(bar, i) in row.bars"
              :key="i"
              class="absolute inset-y-0 rounded-full bg-habit"
              :class="row.usual.anyTime ? 'opacity-25' : 'opacity-45'"
              :style="{ left: `${bar.left}%`, width: `max(${bar.width}%, 0.5rem)` }"
            />
            <span
              class="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-habit ring-2 ring-surface"
              :style="{ left: `${percent(row.usual.minute)}%` }"
            />
          </span>
          <span class="text-right text-sm whitespace-nowrap text-muted tabular-nums">
            <span class="sr-only">
              {{
                row.usual.anyTime
                  ? 'any time of day, '
                  : `usually around ${formatAround(row.usual.minute)}, two thirds between ${formatAround(row.usual.from)} and ${formatAround(row.usual.to)}; `
              }}
            </span>
            <span aria-hidden="true">{{
              row.usual.anyTime ? 'Any time' : formatAround(row.usual.minute)
            }}</span>
          </span>
        </li>
      </ul>
    </div>
  </section>
</template>
