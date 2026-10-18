<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { KINDS, MOMENT_KINDS, kindColor, totalOf, type KindCounts } from '../lib/moments'

// Columns of moments, one segment per kind, stacked in MOMENT_KINDS order from the baseline up.
// In share mode every column is as tall as the next and the segments show proportions.
const {
  bars,
  tickEvery = 1,
  share = false,
  label
} = defineProps<{
  bars: { counts: KindCounts; label: string; tooltip: string }[]
  // Under the columns; every tickEvery-th one is shown
  tickEvery?: number
  share?: boolean
  label: string
}>()

const totals = computed(() => bars.map((bar) => totalOf(bar.counts)))
const max = computed(() => Math.max(1, ...totals.value))
const active = ref<number>()

// Columns start flat and grow in once mounted
const grown = ref(false)
onMounted(() => requestAnimationFrame(() => (grown.value = true)))

const height = (total: number) => {
  if (!grown.value || !total) return '2px'
  return share ? '100%' : `${Math.max(3, (total / max.value) * 100)}%`
}

const percent = (count: number, total: number) => `${Math.round((count / total) * 100)}%`

// Bars near the edges open their tooltip inwards, so it stays inside the card
const tooltipSide = (i: number) =>
  i < bars.length / 4
    ? 'left-0'
    : i >= (bars.length * 3) / 4
      ? 'right-0'
      : 'left-1/2 -translate-x-1/2'
</script>

<template>
  <figure class="grid gap-3">
    <div class="relative h-44" aria-hidden="true">
      <span class="absolute -top-1 left-0 text-[11px] text-muted tabular-nums">
        {{ share ? '100%' : max }}
      </span>
      <div class="absolute inset-x-0 top-0 border-t border-line" />
      <div class="absolute inset-x-0 bottom-0 border-t border-line" />
      <div class="relative flex h-full items-end gap-[2px] pt-4">
        <div
          v-for="(bar, i) in bars"
          :key="i"
          class="relative flex h-full flex-1 items-end justify-center"
          data-bar
          @mouseenter="active = i"
          @mouseleave="active = undefined"
          @click="active = i"
        >
          <div
            class="flex w-full max-w-6 flex-col-reverse gap-[2px] overflow-hidden rounded-t-[4px] transition-[height,opacity] duration-700 ease-spring"
            :class="[!totals[i] && 'bg-line', active !== undefined && active !== i && 'opacity-60']"
            :style="{ height: height(totals[i]!), transitionDelay: grown ? '0ms' : `${i * 12}ms` }"
          >
            <template v-for="kind in MOMENT_KINDS" :key="kind">
              <div
                v-if="bar.counts[kind]"
                class="min-h-px"
                :style="{ flex: `${bar.counts[kind]} 1 0`, background: kindColor(kind) }"
                :data-kind="kind"
              />
            </template>
          </div>
          <Transition
            enter-from-class="opacity-0 translate-y-1"
            leave-to-class="opacity-0"
            enter-active-class="transition duration-150"
            leave-active-class="transition duration-100"
          >
            <div
              v-if="active === i"
              class="pointer-events-none absolute bottom-full z-10 mb-1.5 grid min-w-36 gap-1 rounded-lg bg-fg px-2.5 py-2 text-xs whitespace-nowrap text-bg shadow-lifted"
              :class="tooltipSide(i)"
              data-tooltip
            >
              <span class="font-semibold">{{ bar.tooltip }}</span>
              <span v-if="!totals[i]" class="opacity-70">Nothing reported</span>
              <template v-for="kind in MOMENT_KINDS" :key="kind">
                <span v-if="bar.counts[kind]" class="flex items-center gap-1.5">
                  <span class="size-2 rounded-full" :style="{ background: kindColor(kind) }" />
                  <span class="flex-1">{{ KINDS[kind].plural }}</span>
                  <span class="tabular-nums">
                    {{ share ? percent(bar.counts[kind], totals[i]!) : bar.counts[kind] }}
                  </span>
                </span>
              </template>
            </div>
          </Transition>
        </div>
      </div>
    </div>
    <div class="flex gap-[2px] text-[11px] text-muted" aria-hidden="true">
      <span v-for="(bar, i) in bars" :key="i" class="flex-1 text-center whitespace-nowrap">
        {{ i % tickEvery === 0 ? bar.label : '' }}
      </span>
    </div>
    <figcaption class="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
      <span v-for="kind in MOMENT_KINDS" :key="kind" class="flex items-center gap-1.5">
        <span class="size-2.5 rounded-[3px]" :style="{ background: kindColor(kind) }" />
        {{ KINDS[kind].emoji }} {{ KINDS[kind].plural }}
      </span>
    </figcaption>
    <!-- The numbers for screen readers, in a div: a table grows to fit its cells -->
    <div class="sr-only">
      <table>
        <caption>
          {{
            label
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col">When</th>
            <th v-for="kind in MOMENT_KINDS" :key="kind" scope="col">{{ KINDS[kind].plural }}</th>
            <th scope="col">All</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(bar, i) in bars" :key="i">
            <th scope="row">{{ bar.tooltip }}</th>
            <td v-for="kind in MOMENT_KINDS" :key="kind">{{ bar.counts[kind] }}</td>
            <td>{{ totals[i] }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </figure>
</template>
