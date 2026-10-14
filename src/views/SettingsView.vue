<script setup lang="ts">
import { LogOut, Trash2 } from '@lucide/vue'
import { format } from 'date-fns'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import ChangePasswordForm from '../components/account/ChangePasswordForm.vue'
import ChangeUsernameForm from '../components/account/ChangeUsernameForm.vue'
import DeleteAccountDialog from '../components/account/DeleteAccountDialog.vue'
import AppButton from '../components/ui/AppButton.vue'
import SegmentedControl from '../components/ui/SegmentedControl.vue'
import { useTheme } from '../composables/useTheme'
import { useHabitsStore } from '../stores/habits'
import { useSessionStore } from '../stores/session'

const theme = useTheme()
const session = useSessionStore()
const habits = useHabitsStore()
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

const entries = computed(() => habits.habits.reduce((sum, habit) => sum + habit.tracks.length, 0))
const deleting = ref(false)

const logOut = async () => {
  await session.logout().catch(() => {})
  await router.push({ name: 'login' })
}

const card = 'rounded-3xl border border-line bg-surface p-6 shadow-card'
</script>

<template>
  <div class="mx-auto grid max-w-2xl gap-5 px-4 py-8 sm:px-6 sm:py-12">
    <h1 class="text-3xl font-semibold tracking-tight">Settings</h1>

    <section :class="card" class="flex flex-wrap items-center gap-4">
      <span
        class="grid size-12 place-items-center rounded-full bg-linear-to-br from-violet-500 to-fuchsia-500 text-lg font-semibold text-white uppercase"
        aria-hidden="true"
      >
        {{ session.user?.username.charAt(0) }}
      </span>
      <div class="min-w-0 flex-1">
        <p class="truncate font-semibold">{{ session.user?.username }}</p>
        <p class="text-sm text-muted">
          Since {{ session.user && format(new Date(session.user.createdAt), 'MMMM yyyy') }}
          <template v-if="habits.status === 'ready'">
            · {{ habits.habits.length }} habits, {{ entries }} entries
          </template>
        </p>
      </div>
      <AppButton @click="logOut"><LogOut aria-hidden="true" /> Log out</AppButton>
    </section>

    <section :class="card">
      <h2 class="font-semibold">Appearance</h2>
      <p class="mt-1 text-sm text-muted">System follows your device's light or dark setting.</p>
      <SegmentedControl
        v-model="preference"
        class="mt-4 max-w-sm"
        :options="themes"
        label="Theme"
      />
    </section>

    <section :class="card">
      <h2 class="font-semibold">Username</h2>
      <p class="mt-1 mb-4 text-sm text-muted">What you log in with.</p>
      <ChangeUsernameForm />
    </section>

    <section :class="card">
      <h2 class="font-semibold">Password</h2>
      <p class="mt-1 mb-4 text-sm text-muted">Changing it logs you out everywhere else.</p>
      <ChangePasswordForm />
    </section>

    <section :class="card" class="border-rose-500/30">
      <h2 class="font-semibold">Delete account</h2>
      <p class="mt-1 text-sm text-muted">Removes your account, your habits and every entry.</p>
      <AppButton class="mt-4" variant="danger" @click="deleting = true">
        <Trash2 aria-hidden="true" /> Delete account
      </AppButton>
      <DeleteAccountDialog v-model:open="deleting" />
    </section>
  </div>
</template>
