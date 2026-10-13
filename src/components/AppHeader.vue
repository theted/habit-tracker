<script setup lang="ts">
import { Check, Moon, Sun } from '@lucide/vue'
import { useTheme } from '../composables/useTheme'

const theme = useTheme()

const links = [
  { to: { name: 'home' }, label: 'Habits' },
  { to: { name: 'settings' }, label: 'Settings' }
]
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-line bg-bg/75 backdrop-blur-xl">
    <div class="mx-auto flex h-16 max-w-5xl items-center gap-4 px-4 sm:px-6">
      <RouterLink to="/" class="flex items-center gap-2.5 font-semibold tracking-tight">
        <span
          class="grid size-8 place-items-center rounded-lg bg-linear-to-br from-violet-500 to-fuchsia-500 text-white shadow-card"
        >
          <Check class="size-4" :stroke-width="3" aria-hidden="true" />
        </span>
        Habits
      </RouterLink>
      <nav class="ml-auto flex items-center gap-1 text-sm" aria-label="Main">
        <RouterLink
          v-for="link in links"
          :key="link.label"
          :to="link.to"
          class="rounded-lg px-3 py-1.5 font-medium text-muted transition hover:bg-surface-2 hover:text-fg"
          exact-active-class="bg-surface-2 text-fg"
        >
          {{ link.label }}
        </RouterLink>
        <button
          type="button"
          class="ml-1 grid size-9 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg"
          :aria-label="theme.resolved.value === 'dark' ? 'Use the light theme' : 'Use the dark theme'"
          @click="theme.toggle"
        >
          <Transition
            mode="out-in"
            enter-from-class="opacity-0 rotate-45 scale-75"
            leave-to-class="opacity-0 -rotate-45 scale-75"
            enter-active-class="transition duration-200"
            leave-active-class="transition duration-150"
          >
            <Sun v-if="theme.resolved.value === 'dark'" class="size-4" aria-hidden="true" />
            <Moon v-else class="size-4" aria-hidden="true" />
          </Transition>
        </button>
      </nav>
    </div>
  </header>
</template>
