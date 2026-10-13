<script setup lang="ts">
import { LogOut } from '@lucide/vue'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '../components/ui/AppButton.vue'
import SegmentedControl from '../components/ui/SegmentedControl.vue'
import { clearPassword } from '../auth'
import { useTheme } from '../composables/useTheme'
import { useHabitsStore } from '../stores/habits'

const theme = useTheme()
const store = useHabitsStore()
const router = useRouter()

type Preference = 'auto' | 'light' | 'dark'
const preference = computed({
  get: () => theme.preference.value as Preference,
  set: (value: Preference) => (theme.preference.value = value)
})
const themes: { value: Preference; label: string }[] = [
  { value: 'auto', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' }
]

const entries = computed(() => store.habits.reduce((sum, habit) => sum + habit.tracks.length, 0))

const logOut = () => {
  clearPassword()
  store.$reset()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="mx-auto grid max-w-2xl gap-5 px-4 py-8 sm:px-6 sm:py-12">
    <h1 class="text-3xl font-semibold tracking-tight">Settings</h1>

    <section class="rounded-3xl border border-line bg-surface p-6 shadow-card">
      <h2 class="font-semibold">Appearance</h2>
      <p class="mt-1 text-sm text-muted">System follows your device's light or dark setting.</p>
      <SegmentedControl v-model="preference" class="mt-4 max-w-sm" :options="themes" label="Theme" />
    </section>

    <section class="rounded-3xl border border-line bg-surface p-6 shadow-card">
      <h2 class="font-semibold">This device</h2>
      <p class="mt-1 text-sm text-muted">
        <template v-if="store.status === 'ready'">
          {{ store.habits.length }} habits and {{ entries }} entries.
        </template>
        Logging out forgets the password on this device; your habits stay where they are.
      </p>
      <AppButton class="mt-4" @click="logOut"><LogOut aria-hidden="true" /> Log out</AppButton>
    </section>

    <section class="rounded-3xl border border-line bg-surface p-6 shadow-card">
      <h2 class="font-semibold">About</h2>
      <p class="mt-1 text-sm text-muted">
        Habits keeps count of the things you do, good and bad: tap + each time, and it works out
        your streaks, your busiest hours and days, and a year at a glance.
      </p>
    </section>
  </div>
</template>
