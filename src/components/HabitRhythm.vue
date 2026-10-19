<script setup lang="ts">
import { format, isSameDay } from 'date-fns'
import { computed } from 'vue'
import { peak } from '../lib/stats'
import { formatDuration, GAP_BUCKETS, gapHistogram, rhythm } from '../lib/timing'
import BarChart from './BarChart.vue'

// How far apart a habit's entries come: the typical gap, the longest break, the time since the
// last one, and a histogram from minutes to weeks
const { dates, now } = defineProps<{ dates: Date[]; now: Date }>()

const result = computed(() => rhythm(dates))
const histogram = computed(() => (result.value ? gapHistogram(result.value.gaps) : []))
const since = computed(() => {
  const last = Math.max(...dates.map((date) => date.getTime()))
  return Number.isFinite(last) ? Math.max(0, (+now - last) / 60_000) : undefined
})
// The break going on now is the longest yet
const record = computed(
  () => !!result.value && since.value !== undefined && since.value > result.value.longest.minutes
)

const insight = computed(() =>
  result.value
    ? `Usually ${formatDuration(result.value.typical)} from one entry to the next`
    : 'Log a couple of entries to see how far apart they come'
)

// A figure starts with a capital: "Under a minute"
const figure = (minutes: number) => {
  const text = formatDuration(minutes)
  return text.charAt(0).toUpperCase() + text.slice(1)
}

const span = (from: Date, to: Date) =>
  isSameDay(from, to)
    ? `${format(from, 'd MMM yyyy, HH:mm')}–${format(to, 'HH:mm')}`
    : from.getFullYear() === to.getFullYear()
      ? `${format(from, 'd MMM')} – ${format(to, 'd MMM yyyy')}`
      : `${format(from, 'd MMM yyyy')} – ${format(to, 'd MMM yyyy')}`
</script>

<template>
  <section class="rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-6">
    <header class="mb-5">
      <h2 class="font-semibold">Rhythm</h2>
      <p class="text-sm text-muted">{{ insight }}</p>
    </header>

    <template v-if="result">
      <dl class="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div class="rounded-2xl bg-surface-2 px-4 py-3">
          <dt class="text-xs font-medium text-muted">Typical gap</dt>
          <dd class="mt-1 text-xl font-semibold tracking-tight">
            {{ figure(result.typical) }}
          </dd>
        </div>
        <div class="rounded-2xl bg-surface-2 px-4 py-3">
          <dt class="text-xs font-medium text-muted">Longest break</dt>
          <dd class="mt-1 text-xl font-semibold tracking-tight">
            {{ figure(result.longest.minutes) }}
          </dd>
          <dd class="text-xs text-muted">{{ span(result.longest.from, result.longest.to) }}</dd>
        </div>
        <div
          v-if="since !== undefined"
          class="col-span-2 rounded-2xl bg-surface-2 px-4 py-3 sm:col-span-1"
        >
          <dt class="text-xs font-medium text-muted">Since the last one</dt>
          <dd class="mt-1 text-xl font-semibold tracking-tight">
            {{ since < 1 ? 'Just now' : figure(since) }}
          </dd>
          <dd v-if="record" class="text-xs text-muted" data-record>Your longest break yet</dd>
        </div>
      </dl>

      <h3 class="mb-3 text-sm font-medium">Time between entries</h3>
      <BarChart
        :values="histogram"
        :labels="GAP_BUCKETS.map((bucket) => bucket.label)"
        :tooltips="GAP_BUCKETS.map((bucket) => bucket.name)"
        :highlight="peak(histogram)"
        :label="`Time between entries: ${GAP_BUCKETS.map(
          (bucket, i) => `${bucket.name.toLowerCase()}: ${histogram[i]}`
        ).join(', ')}`"
      />
    </template>
  </section>
</template>
