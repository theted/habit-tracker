<script setup lang="ts">
import { useElementSize } from '@vueuse/core'
import { addMonths, format, startOfMonth } from 'date-fns'
import { computed, ref, useTemplateRef } from 'vue'
import {
  formatClock,
  inWindow,
  minuteOfDay,
  RECENT_DAYS,
  timeAxis,
  weeklyMedians,
  windowStart
} from '../lib/timing'

// Every entry of the last 90 days as a dot: across by date, down by time of day (earlier at the
// top, like a calendar), with a line through each week's median, so a routine that's drifting
// earlier or later shows. The axis fits the entries, cut open at the habit's quiet time.
const { dates, now, label } = defineProps<{ dates: Date[]; now: Date; label: string }>()

const HEIGHT = 208
const PAD = { top: 10, right: 14, bottom: 26, left: 42 }
const WEEK = 7 * 86_400_000

const box = useTemplateRef<HTMLDivElement>('box')
const { width: measured } = useElementSize(box)
// Before it's measured (and in tests), draw at a typical width
const width = computed(() => measured.value || 640)

const start = computed(() => windowStart(now))
const shown = computed(() => inWindow(dates, now))
const axis = computed(() => timeAxis(shown.value.map(minuteOfDay)))

const x = (date: Date | number) =>
  PAD.left + ((+date - +start.value) / (+now - +start.value)) * (width.value - PAD.left - PAD.right)
const y = (value: number) =>
  PAD.top +
  ((value - axis.value.top) / (axis.value.bottom - axis.value.top)) *
    (HEIGHT - PAD.top - PAD.bottom)

const points = computed(() =>
  shown.value.map((date) => ({
    date,
    cx: x(date),
    cy: y(axis.value.place(minuteOfDay(date)))
  }))
)

// Runs of consecutive weeks are joined. A week on its own isn't drawn: its dots say it all.
const medians = computed(() => {
  const runs: { x: number; y: number }[][] = []
  let previous: number | undefined
  for (const median of weeklyMedians(dates, axis.value, start.value, now)) {
    const point = { x: x(median.date), y: y(median.minute) }
    const week = median.week.getTime()
    if (previous !== undefined && week - previous <= WEEK + 3_600_000) runs.at(-1)!.push(point)
    else runs.push([point])
    previous = week
  }
  return runs
})

const months = computed(() => {
  const ticks: { x: number; label: string }[] = []
  for (
    let month = addMonths(startOfMonth(start.value), 1);
    month <= now;
    month = addMonths(month, 1)
  )
    ticks.push({ x: x(month), label: format(month, 'MMM') })
  return ticks
})

// The nearest dot to the pointer, within reach
const active = ref<(typeof points.value)[number]>()
const REACH = 24
const pointerMove = (event: PointerEvent) => {
  let best: (typeof points.value)[number] | undefined
  let bestDistance = REACH
  for (const point of points.value) {
    const distance = Math.hypot(point.cx - event.offsetX, point.cy - event.offsetY)
    if (distance < bestDistance) {
      best = point
      bestDistance = distance
    }
  }
  active.value = best
}
</script>

<template>
  <figure class="grid gap-3">
    <p v-if="!shown.length" class="py-10 text-center text-sm text-muted">
      Nothing logged in the last {{ RECENT_DAYS }} days
    </p>
    <div v-else ref="box" class="relative">
      <svg
        :width="width"
        :height="HEIGHT"
        class="block w-full touch-pan-y overflow-visible"
        role="img"
        :aria-label="label"
        @pointermove="pointerMove"
        @pointerdown="pointerMove"
        @pointerleave="active = undefined"
      >
        <g class="text-[11px]">
          <template v-for="tick in axis.ticks" :key="tick">
            <line
              :x1="PAD.left"
              :x2="width - PAD.right"
              :y1="y(tick)"
              :y2="y(tick)"
              class="stroke-line"
              stroke-width="1"
            />
            <text
              :x="PAD.left - 8"
              :y="y(tick)"
              text-anchor="end"
              dominant-baseline="middle"
              class="fill-muted tabular-nums"
            >
              {{ formatClock(tick) }}
            </text>
          </template>
          <text
            v-for="month in months"
            :key="month.label"
            :x="month.x"
            :y="HEIGHT - 6"
            text-anchor="middle"
            class="fill-muted"
          >
            {{ month.label }}
          </text>
        </g>
        <circle
          v-for="point in points"
          :key="point.date.getTime()"
          :cx="point.cx"
          :cy="point.cy"
          r="4"
          class="fill-habit stroke-surface [fill-opacity:0.55] dark:[fill-opacity:0.8]"
          stroke-width="1.5"
          data-dot
        />
        <g
          class="fill-none stroke-fg"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline
            v-for="(run, i) in medians.filter((run) => run.length > 1)"
            :key="i"
            :points="run.map((p) => `${p.x},${p.y}`).join(' ')"
          />
        </g>
        <circle
          v-if="active"
          :cx="active.cx"
          :cy="active.cy"
          r="6"
          class="fill-habit stroke-surface"
          stroke-width="2"
        />
      </svg>
      <Transition
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
        enter-active-class="transition duration-150"
        leave-active-class="transition duration-100"
      >
        <span
          v-if="active"
          class="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-fg px-2 py-1 text-xs whitespace-nowrap text-bg shadow-lifted"
          :style="{ left: `${active.cx}px`, top: `${active.cy - 10}px` }"
        >
          <strong class="font-semibold tabular-nums">{{ format(active.date, 'HH:mm') }}</strong>
          · {{ format(active.date, 'EEE d MMM') }}
        </span>
      </Transition>
    </div>
    <figcaption
      v-if="shown.length"
      class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted"
      aria-hidden="true"
    >
      <span class="flex items-center gap-1.5">
        <span class="size-2 rounded-full bg-habit opacity-70" /> An entry
      </span>
      <span class="flex items-center gap-1.5">
        <span class="h-0.5 w-4 rounded-full bg-fg" /> The week's median
      </span>
    </figcaption>
  </figure>
</template>
