<script setup lang="ts">
import { ArrowDown, ArrowUp, Bot, KeyRound, Minus, RotateCw } from '@lucide/vue'
import { useDocumentVisibility, useIntervalFn } from '@vueuse/core'
import { format } from 'date-fns'
import { computed, onMounted, ref, watch } from 'vue'
import MomentGroups from '../components/MomentGroups.vue'
import MomentList from '../components/MomentList.vue'
import StackedBarChart from '../components/StackedBarChart.vue'
import AnimatedNumber from '../components/ui/AnimatedNumber.vue'
import AppButton from '../components/ui/AppButton.vue'
import { buttonClass } from '../components/ui/button'
import SegmentedControl from '../components/ui/SegmentedControl.vue'
import { useMinuteClock } from '../composables/useMinuteClock'
import {
  KINDS,
  MOMENT_KINDS,
  PERIODS,
  buckets,
  countKinds,
  goodShare,
  groupMoments,
  inRange,
  kindColor,
  kindsByHour,
  kindsByWeekday,
  peakOf,
  periodRange,
  totalOf,
  type KindCounts,
  type MomentKind,
  type Period
} from '../lib/moments'
import { useMomentsStore } from '../stores/moments'
import { useToastStore } from '../stores/toasts'

const store = useMomentsStore()
const toasts = useToastStore()
const now = useMinuteClock()

// Agents report from elsewhere: fetch on every visit, when the tab comes back into view, and every
// couple of minutes while it's open
const refresh = () => store.load().catch((err) => toasts.error(err, "Couldn't load the moments"))
onMounted(refresh)
const visibility = useDocumentVisibility()
watch(visibility, (state) => state === 'visible' && refresh())
useIntervalFn(() => visibility.value === 'visible' && store.load().catch(() => {}), 120_000)

const period = ref<Period>('month')
const periods = (Object.keys(PERIODS) as Period[]).map((value) => ({
  value,
  label: PERIODS[value].label
}))

const range = computed(() => periodRange(period.value, now.value))
const current = computed(() => inRange(store.moments, range.value.from))
const previous = computed(() => inRange(store.moments, range.value.previousFrom, range.value.from))
const counts = computed(() => countKinds(current.value))
const before = computed(() => countKinds(previous.value))
const total = computed(() => totalOf(counts.value))

const percent = (share: number | undefined) =>
  share === undefined ? undefined : Math.round(share * 100)

// The tiles: one per kind, and the share of good times, each against the period before
const tiles = computed(() => [
  ...MOMENT_KINDS.map((kind) => ({
    key: kind,
    label: KINDS[kind].plural,
    emoji: KINDS[kind].emoji,
    color: kindColor(kind),
    value: counts.value[kind] as number | undefined,
    was: before.value[kind] as number | undefined,
    unit: ''
  })),
  {
    key: 'share',
    label: 'Good share',
    emoji: '⚖️',
    color: undefined,
    value: percent(goodShare(counts.value)),
    was: percent(goodShare(before.value)),
    unit: '%'
  }
])

const trend = (value?: number, was?: number) =>
  value === undefined || was === undefined || value === was
    ? Minus
    : value > was
      ? ArrowUp
      : ArrowDown

// Over time
type Scale = 'count' | 'share'
const scale = ref<Scale>('count')
const scales: { value: Scale; label: string }[] = [
  { value: 'count', label: 'Count' },
  { value: 'share', label: 'Share' }
]

const timeline = computed(() => {
  const { unit, count } = PERIODS[period.value]
  return buckets(store.moments, period.value, now.value).map((bucket, i) => {
    const fromEnd = count - 1 - i
    const label =
      unit === 'month'
        ? format(bucket.start, 'MMM')
        : unit === 'week'
          ? fromEnd % 3 === 0
            ? format(bucket.start, 'd MMM')
            : ''
          : fromEnd === 0
            ? 'Today'
            : count <= 7
              ? format(bucket.start, 'EEE')
              : fromEnd % 7 === 0
                ? format(bucket.start, 'd MMM')
                : ''
    const tooltip =
      unit === 'month'
        ? format(bucket.start, 'MMMM yyyy')
        : unit === 'week'
          ? `Week of ${format(bucket.start, 'd MMM')}`
          : format(bucket.start, 'EEE d MMM')
    return { counts: bucket.counts, label, tooltip }
  })
})

const overTimeInsight = computed(() => {
  const span = PERIODS[period.value].span
  if (!total.value) return `Nothing reported in ${span}`
  const share = percent(goodShare(counts.value))
  const moments = total.value === 1 ? '1 moment' : `${total.value} moments`
  return `${moments} in ${span}` + (share === undefined ? '' : ` · ${share}% of the moods good`)
})

// When
type Pattern = 'hour' | 'weekday'
const pattern = ref<Pattern>('hour')
const patterns: { value: Pattern; label: string }[] = [
  { value: 'hour', label: 'Time of day' },
  { value: 'weekday', label: 'Weekday' }
]
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const hh = (hour: number) => String(hour % 24).padStart(2, '0')

// What stands out: when you're most annoying, else when it's roughest, else when it's busiest
const standout = (values: KindCounts[], describe: (index: number) => string) => {
  const sets: [readonly MomentKind[], string][] = [
    [['user_annoying'], "You're most annoying"],
    [['annoying'], 'Roughest'],
    [MOMENT_KINDS, 'Most moments']
  ]
  for (const [kinds, prefix] of sets) {
    const top = peakOf(values, kinds)
    if (top !== undefined) return `${prefix} ${describe(top)}`
  }
  return `Nothing reported in ${PERIODS[period.value].span}`
}

const when = computed(() => {
  if (pattern.value === 'hour') {
    const values = kindsByHour(current.value)
    return {
      bars: values.map((counts, hour) => ({
        counts,
        label: hh(hour),
        tooltip: `${hh(hour)}:00–${hh(hour)}:59`
      })),
      tickEvery: 3,
      insight: standout(values, (hour) => `between ${hh(hour)}:00 and ${hh(hour + 1)}:00`)
    }
  }
  const values = kindsByWeekday(current.value)
  return {
    bars: values.map((counts, day) => ({
      counts,
      label: WEEKDAYS[day]!.slice(0, 3),
      tooltip: WEEKDAYS[day]!
    })),
    tickEvery: 1,
    insight: standout(values, (day) => `on ${WEEKDAYS[day]}s`)
  }
})

// Where
type Field = 'project' | 'agent'
const field = ref<Field>('project')
const fields: { value: Field; label: string }[] = [
  { value: 'project', label: 'Projects' },
  { value: 'agent', label: 'Agents' }
]
const groups = computed(() =>
  groupMoments(current.value, field.value, {
    unnamed: field.value === 'project' ? 'No project' : 'Unnamed agent'
  })
)

const loading = computed(() => store.status === 'idle' || store.status === 'loading')
const card = 'rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-6'
</script>

<template>
  <div class="mx-auto grid max-w-5xl gap-5 px-4 py-8 sm:px-6 sm:py-12">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-sm font-medium text-muted">From your AI agents</p>
        <h1 class="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">How it's going</h1>
      </div>
      <SegmentedControl
        v-if="store.moments.length"
        v-model="period"
        class="w-full sm:w-auto"
        :options="periods"
        label="Period"
      />
    </div>

    <div v-if="loading" class="grid gap-5" aria-busy="true">
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div v-for="i in 5" :key="i" class="h-24 animate-pulse rounded-2xl bg-surface-2" />
      </div>
      <div class="h-72 animate-pulse rounded-3xl bg-surface-2" />
    </div>

    <div
      v-else-if="store.status === 'error'"
      class="grid justify-items-center gap-4 rounded-3xl border border-dashed border-line px-6 py-14 text-center"
    >
      <p class="text-muted">The moments couldn't be loaded.</p>
      <AppButton @click="refresh"><RotateCw aria-hidden="true" /> Try again</AppButton>
    </div>

    <div
      v-else-if="!store.moments.length"
      class="grid justify-items-center gap-4 rounded-3xl border border-dashed border-line px-6 py-16 text-center"
    >
      <span
        class="grid size-16 place-items-center rounded-2xl bg-linear-to-br from-violet-500/15 to-fuchsia-500/15 text-violet-500"
      >
        <Bot class="size-8" aria-hidden="true" />
      </span>
      <div>
        <h2 class="text-lg font-semibold">No moments yet</h2>
        <p class="mt-1 max-w-md text-muted">
          Connect an AI agent such as Claude Code and it will report good times, annoying times, and
          the times you were annoying. They'll show up here, with statistics over time.
        </p>
      </div>
      <RouterLink :to="{ name: 'settings', hash: '#agents' }" :class="buttonClass('primary')">
        <KeyRound aria-hidden="true" /> Connect an agent
      </RouterLink>
    </div>

    <template v-else>
      <section aria-label="Totals" class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div
          v-for="tile in tiles"
          :key="tile.key"
          class="rounded-2xl border border-line bg-surface p-4 shadow-card"
          :data-tile="tile.key"
        >
          <p class="flex items-center gap-1.5 text-xs font-medium text-muted">
            <span
              v-if="tile.color"
              class="size-2.5 shrink-0 rounded-[3px]"
              :style="{ background: tile.color }"
              aria-hidden="true"
            />
            <span class="truncate">{{ tile.label }}</span>
          </p>
          <p class="mt-2 flex items-baseline gap-1.5 text-2xl font-semibold tracking-tight">
            <span class="text-lg" aria-hidden="true">{{ tile.emoji }}</span>
            <span v-if="tile.value === undefined">–</span>
            <!-- A flex box of its own: no gap, and no space, between the number and the % -->
            <span v-else class="inline-flex items-baseline">
              <AnimatedNumber :value="tile.value" />
              <span v-if="tile.unit" class="text-sm font-medium text-muted">{{ tile.unit }}</span>
            </span>
          </p>
          <p class="mt-1 flex items-center gap-1 text-xs text-muted">
            <component :is="trend(tile.value, tile.was)" class="size-3" aria-hidden="true" />
            <template v-if="tile.was === undefined">nothing to compare</template>
            <template v-else>was {{ tile.was }}{{ tile.unit }}</template>
          </p>
        </div>
      </section>

      <section :class="card">
        <header class="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 class="font-semibold">Over time</h2>
            <Transition mode="out-in" name="page">
              <p :key="overTimeInsight" class="text-sm text-muted">{{ overTimeInsight }}</p>
            </Transition>
          </div>
          <SegmentedControl v-model="scale" :options="scales" label="Scale" />
        </header>
        <StackedBarChart
          :key="`${period}-${scale}`"
          :bars="timeline"
          :share="scale === 'share'"
          :label="`Moments over ${PERIODS[period].span}: ${overTimeInsight}`"
        />
      </section>

      <div class="grid gap-5 lg:grid-cols-2">
        <section :class="card">
          <header class="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 class="font-semibold">When</h2>
              <Transition mode="out-in" name="page">
                <p :key="when.insight" class="text-sm text-muted">{{ when.insight }}</p>
              </Transition>
            </div>
            <SegmentedControl v-model="pattern" :options="patterns" label="Pattern" />
          </header>
          <StackedBarChart
            :key="`${period}-${pattern}`"
            :bars="when.bars"
            :tick-every="when.tickEvery"
            :label="`Moments by ${pattern === 'hour' ? 'time of day' : 'weekday'}: ${when.insight}`"
          />
        </section>

        <section :class="card">
          <header class="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 class="font-semibold">Where</h2>
              <p class="text-sm text-muted">
                The busiest {{ field }}s in {{ PERIODS[period].span }}
              </p>
            </div>
            <SegmentedControl v-model="field" :options="fields" label="Group by" />
          </header>
          <MomentGroups :key="`${period}-${field}`" :groups />
        </section>
      </div>

      <section :class="card">
        <header class="mb-5">
          <h2 class="font-semibold">Moments</h2>
          <p class="text-sm text-muted">Everything your agents have reported, newest first.</p>
        </header>
        <MomentList :moments="store.moments" />
      </section>
    </template>
  </div>
</template>
