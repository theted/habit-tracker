<script setup lang="ts">
import { Check, Flame } from '@lucide/vue'
import { computed } from 'vue'
import { useHabitStats } from '../composables/useHabitStats'
import { useTracking } from '../composables/useTracking'
import { habitStyle } from '../lib/colors'
import { lastDays } from '../lib/stats'
import type { Habit } from '../types'
import MiniBars from './MiniBars.vue'
import TrackButton from './TrackButton.vue'
import AnimatedNumber from './ui/AnimatedNumber.vue'

const { habit } = defineProps<{ habit: Habit }>()

const { summary, days, now } = useHabitStats(() => habit)
const { track } = useTracking()
const fortnight = computed(() => lastDays(days.value, 14, now.value).map((day) => day.count))
</script>

<template>
  <article
    class="group relative flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-card transition duration-300 ease-spring hover:-translate-y-0.5 hover:shadow-lifted"
    :style="habitStyle(habit.color)"
  >
    <RouterLink
      :to="{ name: 'habit', params: { id: habit.id } }"
      class="absolute inset-0 rounded-2xl"
      :aria-label="`${habit.title}: statistics and history`"
    />
    <div class="flex items-start gap-3">
      <span class="relative grid size-12 shrink-0 place-items-center rounded-2xl bg-habit/15 text-2xl">
        {{ habit.emoji }}
        <Transition name="pop">
          <span
            v-if="summary.today"
            class="absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full bg-habit text-white ring-2 ring-surface"
            title="Done today"
          >
            <Check class="size-3" :stroke-width="3" aria-hidden="true" />
          </span>
        </Transition>
      </span>
      <div class="min-w-0 flex-1">
        <h2 class="truncate font-semibold">{{ habit.title }}</h2>
        <p class="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm text-muted">
          <span><AnimatedNumber :value="summary.today" /> today</span>
          <span
            v-if="summary.currentStreak > 1"
            class="inline-flex items-center gap-0.5"
            :title="`${summary.currentStreak}-day streak`"
          >
            · <Flame class="size-3.5 text-orange-500" aria-hidden="true" />
            {{ summary.currentStreak }} days
          </span>
        </p>
      </div>
      <TrackButton
        class="relative z-10"
        :color="habit.color"
        :label="`Log ${habit.title}`"
        @track="track(habit)"
      />
    </div>
    <MiniBars
      class="mt-5"
      :values="fortnight"
      :label="`Entries over the last 14 days: ${fortnight.join(', ')}`"
    />
    <div class="mt-2 flex justify-between text-[11px] text-muted" aria-hidden="true">
      <span>2 weeks ago</span>
      <span>Today</span>
    </div>
  </article>
</template>
