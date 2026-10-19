<script setup lang="ts">
import { computed } from 'vue'
import {
  drift,
  formatAround,
  formatDuration,
  formatWindow,
  inWindow,
  persona,
  RECENT_DAYS,
  usualTime
} from '../lib/timing'
import PunchCard from './PunchCard.vue'
import TimeScatter from './TimeScatter.vue'

// When a habit happens: its usual time and how it's moving, a punch card of weekdays and hours, and
// every recent entry by time of day
const { dates, now } = defineProps<{ dates: Date[]; now: Date }>()

const usual = computed(() => usualTime(dates, now))
const name = computed(() => usual.value && persona(usual.value))
// The punch card covers the same entries as the usual time
const covered = computed(() => (usual.value?.recent ? inWindow(dates, now) : dates))

const over = computed(() =>
  usual.value?.recent ? `over the last ${RECENT_DAYS} days` : `over all ${dates.length} entries`
)
const insight = computed(() => {
  const value = usual.value
  if (!value) return 'Log a few entries to see when you usually get round to it'
  if (value.anyTime) return `No particular time of day, ${over.value}`
  const range = formatWindow(value.from, value.to)
  return range.includes('–')
    ? `Usually between ${range.replace('–', ' and ')}, ${over.value}`
    : `Usually around ${range}, ${over.value}`
})

const change = computed(() => {
  const minutes = drift(dates, now)
  if (minutes === undefined) return undefined
  if (Math.abs(minutes) < 5) return 'About the same'
  return `${formatDuration(Math.abs(minutes))} ${minutes < 0 ? 'earlier' : 'later'}`
})

const scatterLabel = computed(
  () =>
    `Entry times over the last ${RECENT_DAYS} days, by date and time of day, with a line through ` +
    `each week's median. ${insight.value}. Every entry is also listed under Entries.`
)
</script>

<template>
  <section class="rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-6">
    <header class="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="font-semibold">Time of day</h2>
        <p class="text-sm text-muted">{{ insight }}</p>
      </div>
      <span
        v-if="name"
        class="inline-flex items-center gap-1.5 rounded-full bg-habit/15 px-3 py-1 text-sm font-medium"
        data-persona
      >
        <span aria-hidden="true">{{ name.emoji }}</span> {{ name.label }}
      </span>
    </header>

    <template v-if="usual">
      <dl class="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div class="rounded-2xl bg-surface-2 px-4 py-3">
          <dt class="text-xs font-medium text-muted">
            {{ usual.anyTime ? 'Middle of it all' : 'Usually around' }}
          </dt>
          <dd class="mt-1 text-xl font-semibold tracking-tight">
            {{ formatAround(usual.minute) }}
          </dd>
        </div>
        <div class="rounded-2xl bg-surface-2 px-4 py-3">
          <dt class="text-xs font-medium text-muted">Two thirds of entries</dt>
          <dd class="mt-1 text-xl font-semibold tracking-tight">
            {{ formatWindow(usual.from, usual.to) }}
          </dd>
        </div>
        <div v-if="change" class="col-span-2 rounded-2xl bg-surface-2 px-4 py-3 sm:col-span-1">
          <dt class="text-xs font-medium text-muted">The last 30 days</dt>
          <dd class="mt-1 text-xl font-semibold tracking-tight">{{ change }}</dd>
          <dd class="text-xs text-muted">than the 30 before</dd>
        </div>
      </dl>

      <h3 class="mb-3 text-sm font-medium">By weekday and hour</h3>
      <PunchCard :dates="covered" />

      <h3 class="mt-8 mb-3 text-sm font-medium">Every entry, last {{ RECENT_DAYS }} days</h3>
      <TimeScatter :dates :now :label="scatterLabel" />
    </template>
  </section>
</template>
