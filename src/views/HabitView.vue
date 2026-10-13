<script setup lang="ts">
import { computed, onMounted } from 'vue'
import HabitDetail from '../components/HabitDetail.vue'
import { buttonClass } from '../components/ui/button'
import { useHabitsStore } from '../stores/habits'
import { useToastStore } from '../stores/toasts'

const { id } = defineProps<{ id: string }>()

const store = useHabitsStore()
const toasts = useToastStore()
onMounted(() => {
  if (store.status === 'idle') {
    store.load().catch((err) => toasts.error(err, "Couldn't load the habit"))
  }
})

const habit = computed(() => store.byId(Number(id)))
const loading = computed(() => store.status === 'idle' || store.status === 'loading')
</script>

<template>
  <HabitDetail v-if="habit" :habit />
  <div v-else-if="loading" class="mx-auto grid max-w-5xl gap-5 px-4 py-10 sm:px-6" aria-busy="true">
    <div class="h-5 w-24 animate-pulse rounded-lg bg-surface-2" />
    <div class="h-36 animate-pulse rounded-3xl bg-surface-2" />
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <div v-for="i in 6" :key="i" class="h-20 animate-pulse rounded-2xl bg-surface-2" />
    </div>
    <div class="h-56 animate-pulse rounded-3xl bg-surface-2" />
  </div>
  <div v-else class="mx-auto grid max-w-md justify-items-center gap-4 px-4 py-24 text-center">
    <h1 class="text-2xl font-semibold tracking-tight">Habit not found</h1>
    <p class="text-muted">It may have been deleted.</p>
    <RouterLink to="/" :class="buttonClass('primary')">Back to your habits</RouterLink>
  </div>
</template>
