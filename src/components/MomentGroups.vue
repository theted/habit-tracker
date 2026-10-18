<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { KINDS, MOMENT_KINDS, kindColor, type Group } from '../lib/moments'

// One row per project (or agent): a bar as long as its share of the busiest row, split by kind
const { groups } = defineProps<{ groups: Group[] }>()

const max = computed(() => Math.max(1, ...groups.map((group) => group.total)))

const grown = ref(false)
onMounted(() => requestAnimationFrame(() => (grown.value = true)))

const breakdown = (group: Group) =>
  MOMENT_KINDS.filter((kind) => group.counts[kind])
    .map((kind) => `${group.counts[kind]} ${KINDS[kind].plural.toLowerCase()}`)
    .join(', ')
</script>

<template>
  <p v-if="!groups.length" class="py-6 text-center text-sm text-muted">Nothing reported yet.</p>
  <ul v-else class="grid gap-3.5">
    <li v-for="group in groups" :key="group.name" class="grid gap-1.5" :title="breakdown(group)">
      <div class="flex items-baseline justify-between gap-3 text-sm">
        <span class="truncate font-medium">{{ group.name }}</span>
        <span class="text-muted tabular-nums">{{ group.total }}</span>
      </div>
      <div class="h-2.5">
        <div
          class="flex h-full gap-[2px] overflow-hidden rounded-[4px] transition-[width] duration-700 ease-spring"
          :style="{ width: grown ? `${Math.max(2, (group.total / max) * 100)}%` : '0%' }"
          aria-hidden="true"
        >
          <template v-for="kind in MOMENT_KINDS" :key="kind">
            <div
              v-if="group.counts[kind]"
              :style="{ flex: `${group.counts[kind]} 1 0`, background: kindColor(kind) }"
              :data-kind="kind"
            />
          </template>
        </div>
      </div>
      <span class="sr-only">{{ breakdown(group) }}</span>
    </li>
  </ul>
</template>
