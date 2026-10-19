<script setup lang="ts">
import { computed, ref } from 'vue'
import { byWeekdayAndHour } from '../lib/timing'

// When in the week a habit happens: a dot per weekday and hour, bigger and stronger for more
// entries. Like the heatmap, hovering (or tapping) a cell describes it in the caption.
const { dates } = defineProps<{ dates: Date[] }>()

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const HOURS = Array.from({ length: 24 }, (_, hour) => hour)
const hh = (hour: number) => String(hour % 24).padStart(2, '0')
const entries = (count: number) => (count === 1 ? '1 entry' : `${count} entries`)

const grid = computed(() => byWeekdayAndHour(dates))
const max = computed(() => Math.max(1, ...grid.value.flat()))

// Area grows with the count, so the diameter goes with its square root
const dotStyle = (count: number) => {
  const share = count / max.value
  return {
    width: `${30 + 70 * Math.sqrt(share)}%`,
    opacity: 0.45 + 0.55 * share
  }
}

const busiest = computed(() => {
  let best = { day: 0, hour: 0, count: 0 }
  grid.value.forEach((row, day) =>
    row.forEach((count, hour) => {
      if (count > best.count) best = { day, hour, count }
    })
  )
  return best.count ? best : undefined
})

const hovered = ref<{ day: number; hour: number }>()
const caption = computed(() => {
  const cell = hovered.value
  if (cell) {
    const count = grid.value[cell.day]![cell.hour]!
    return `${WEEKDAYS[cell.day]}s ${hh(cell.hour)}:00–${hh(cell.hour)}:59 · ${entries(count)}`
  }
  const top = busiest.value
  return top
    ? `Busiest on ${WEEKDAYS[top.day]}s between ${hh(top.hour)}:00 and ${hh(top.hour + 1)}:00`
    : 'No entries yet'
})
</script>

<template>
  <figure class="grid gap-3">
    <div
      class="grid grid-cols-[2rem_repeat(24,minmax(0,1fr))] gap-y-1"
      aria-hidden="true"
      @mouseleave="hovered = undefined"
    >
      <template v-for="(row, day) in grid" :key="day">
        <span class="self-center text-[10px] text-muted">{{ WEEKDAYS[day]!.slice(0, 3) }}</span>
        <span
          v-for="(count, hour) in row"
          :key="hour"
          class="grid aspect-square max-h-6 place-items-center rounded-md transition-colors"
          :class="hovered?.day === day && hovered.hour === hour && 'bg-surface-2'"
          data-cell
          :data-count="count"
          @mouseenter="hovered = { day, hour }"
          @click="hovered = { day, hour }"
        >
          <span
            v-if="count"
            class="aspect-square max-w-4 rounded-full bg-habit"
            :style="dotStyle(count)"
          />
          <span v-else class="size-[3px] rounded-full bg-line" />
        </span>
      </template>
      <span />
      <span
        v-for="hour in HOURS"
        :key="hour"
        class="pt-1 text-center text-[10px] text-muted tabular-nums"
      >
        {{ hour % 3 === 0 ? hh(hour) : '' }}
      </span>
    </div>
    <figcaption class="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
      <span aria-live="polite">{{ caption }}</span>
      <span class="flex items-center gap-1.5" aria-hidden="true">
        Fewer
        <span v-for="share in [0.15, 0.5, 1]" :key="share" class="grid size-4 place-items-center">
          <span
            class="aspect-square rounded-full bg-habit"
            :style="{ width: `${30 + 70 * Math.sqrt(share)}%`, opacity: 0.45 + 0.55 * share }"
          />
        </span>
        More
      </span>
    </figcaption>
    <div class="sr-only">
      <table>
        <caption>
          Entries by weekday and hour
        </caption>
        <thead>
          <tr>
            <th scope="col">Weekday</th>
            <th v-for="hour in HOURS" :key="hour" scope="col">{{ hh(hour) }}:00</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, day) in grid" :key="day">
            <th scope="row">{{ WEEKDAYS[day] }}</th>
            <td v-for="(count, hour) in row" :key="hour">{{ count }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </figure>
</template>
