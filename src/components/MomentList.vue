<script setup lang="ts">
import { X } from '@lucide/vue'
import { format, isSameYear, isToday, isYesterday } from 'date-fns'
import { computed, ref, watch } from 'vue'
import { dayKey } from '../lib/stats'
import { KINDS, MOMENT_KINDS, countKinds, kindColor, type MomentKind } from '../lib/moments'
import { useMomentsStore } from '../stores/moments'
import { useToastStore } from '../stores/toasts'
import type { Moment } from '../types'
import AppButton from './ui/AppButton.vue'

// Every moment, newest first and grouped by day, with a filter by kind
const { moments } = defineProps<{ moments: Moment[] }>()
const store = useMomentsStore()
const toasts = useToastStore()

const PAGE = 20
const limit = ref(PAGE)
const kind = ref<MomentKind>()
watch(kind, () => (limit.value = PAGE))

const counts = computed(() => countKinds(moments))
const filtered = computed(() =>
  kind.value ? moments.filter((moment) => moment.kind === kind.value) : moments
)

const dayLabel = (date: Date) =>
  isToday(date)
    ? 'Today'
    : isYesterday(date)
      ? 'Yesterday'
      : format(date, isSameYear(date, new Date()) ? 'EEEE d MMMM' : 'EEEE d MMMM yyyy')

const groups = computed(() => {
  const result: { key: string; label: string; entries: (Moment & { time: string })[] }[] = []
  for (const moment of filtered.value.slice(-limit.value).reverse()) {
    const date = new Date(moment.date)
    const key = dayKey(date)
    let group = result.at(-1)
    if (group?.key !== key) result.push((group = { key, label: dayLabel(date), entries: [] }))
    group.entries.push({ ...moment, time: format(date, 'HH:mm') })
  }
  return result
})

const remove = async (moment: Moment) => {
  try {
    await store.remove(moment.id)
    toasts.show('Moment removed')
  } catch (err) {
    toasts.error(err, "Couldn't remove the moment")
  }
}

const chip =
  'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition'
</script>

<template>
  <div class="grid gap-5">
    <div class="flex flex-wrap gap-2" role="group" aria-label="Show">
      <button
        type="button"
        :class="[chip, !kind ? 'border-fg bg-fg text-bg' : 'border-line text-muted hover:text-fg']"
        :aria-pressed="!kind"
        @click="kind = undefined"
      >
        All <span class="tabular-nums opacity-70">{{ moments.length }}</span>
      </button>
      <button
        v-for="key in MOMENT_KINDS"
        :key
        type="button"
        :class="[
          chip,
          kind === key ? 'border-fg bg-fg text-bg' : 'border-line text-muted hover:text-fg'
        ]"
        :aria-pressed="kind === key"
        @click="kind = kind === key ? undefined : key"
      >
        <span class="size-2 rounded-full" :style="{ background: kindColor(key) }" />
        {{ KINDS[key].plural }}
        <span class="tabular-nums opacity-70">{{ counts[key] }}</span>
      </button>
    </div>

    <p v-if="!filtered.length" class="py-6 text-center text-sm text-muted">
      Nothing reported{{ kind ? ' of this kind' : '' }} yet.
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
            class="group flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-2"
          >
            <span
              class="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg text-base"
              :style="{
                background: `color-mix(in oklch, ${kindColor(entry.kind)} 18%, transparent)`
              }"
              :title="KINDS[entry.kind]?.label"
            >
              {{ KINDS[entry.kind]?.emoji ?? '·' }}
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-sm break-words">{{ entry.note }}</p>
              <p class="mt-0.5 text-xs text-muted">
                <span class="sr-only">{{ KINDS[entry.kind]?.label }}, </span>
                <span class="tabular-nums">{{ entry.time }}</span>
                <template v-if="entry.project"> · {{ entry.project }}</template>
                <template v-if="entry.agent"> · {{ entry.agent }}</template>
              </p>
            </div>
            <button
              type="button"
              class="grid size-7 shrink-0 place-items-center rounded-lg text-muted opacity-60 transition hover:bg-surface hover:text-rose-600 hover:opacity-100 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              :aria-label="`Remove the moment at ${entry.time}, ${group.label}`"
              @click="remove(entry)"
            >
              <X class="size-4" aria-hidden="true" />
            </button>
          </li>
        </TransitionGroup>
      </section>
    </TransitionGroup>
    <div v-if="filtered.length > limit" class="flex justify-center">
      <AppButton size="sm" @click="limit += PAGE">Show older moments</AppButton>
    </div>
  </div>
</template>
