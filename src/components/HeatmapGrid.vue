<script setup lang="ts">
import { format } from 'date-fns'
import { computed, onMounted, ref, useTemplateRef } from 'vue'
import { heatmap, type DayCounts, type HeatmapCell } from '../lib/stats'

const { days, now, weeks = 53 } = defineProps<{ days: DayCounts; now: Date; weeks?: number }>()

const columns = computed(() => heatmap(days, weeks, now))

// A month's name over the first column that starts in it
const monthLabels = computed(() =>
  columns.value.map((column, i) => {
    const month = column[0]!.date.getMonth()
    return i === 0 || month !== columns.value[i - 1]![0]!.date.getMonth()
      ? format(column[0]!.date, 'MMM')
      : ''
  })
)

const LEVELS = ['bg-line', 'bg-habit/25', 'bg-habit/50', 'bg-habit/75', 'bg-habit']
const WEEKDAYS = ['Mon', '', 'Wed', '', 'Fri', '', '']

const hovered = ref<HeatmapCell>()
const caption = computed(() => {
  const cell = hovered.value
  if (!cell) return 'Hover over a day to see its entries'
  const entries = cell.count === 1 ? '1 entry' : `${cell.count} entries`
  return `${entries} on ${format(cell.date, 'EEEE d MMMM yyyy')}`
})

const activeDays = computed(() => columns.value.flat().filter((cell) => cell.count > 0).length)

// Open on the most recent weeks when the year doesn't fit
const scroller = useTemplateRef<HTMLDivElement>('scroller')
onMounted(() => {
  if (scroller.value) scroller.value.scrollLeft = scroller.value.scrollWidth
})
</script>

<template>
  <figure class="grid gap-3">
    <div ref="scroller" class="overflow-x-auto pb-1 [scrollbar-width:thin]">
      <div
        class="flex w-max gap-[3px]"
        role="img"
        :aria-label="`Entries per day over the past year: ${activeDays} active days`"
        @mouseleave="hovered = undefined"
      >
        <div class="flex flex-col gap-[3px] pt-5 pr-1.5 text-[10px] leading-3 text-muted">
          <span v-for="(weekday, i) in WEEKDAYS" :key="i" class="h-3">{{ weekday }}</span>
        </div>
        <div v-for="(column, w) in columns" :key="w" class="relative flex flex-col gap-[3px] pt-5">
          <span class="absolute top-0 left-0 text-[10px] whitespace-nowrap text-muted">
            {{ monthLabels[w] }}
          </span>
          <span
            v-for="cell in column"
            :key="cell.date.getTime()"
            class="size-3 rounded-[3px] transition-[background-color,transform] duration-200 hover:scale-125"
            :class="[
              cell.future ? 'invisible' : LEVELS[cell.level],
              hovered === cell && 'ring-2 ring-fg/40'
            ]"
            :data-level="cell.level"
            @mouseenter="hovered = cell"
            @click="hovered = cell"
          />
        </div>
      </div>
    </div>
    <figcaption class="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
      <span aria-live="polite">{{ caption }}</span>
      <span class="flex items-center gap-1" aria-hidden="true">
        Less
        <span v-for="level in LEVELS" :key="level" class="size-3 rounded-[3px]" :class="level" />
        More
      </span>
    </figcaption>
  </figure>
</template>
