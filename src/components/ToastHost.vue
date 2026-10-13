<script setup lang="ts">
import { CircleAlert, CircleCheck, Info, X } from '@lucide/vue'
import { useToastStore, type Toast } from '../stores/toasts'

const store = useToastStore()

const run = async (toast: Toast) => {
  store.dismiss(toast.id)
  try {
    await toast.action?.run()
  } catch (err) {
    store.error(err)
  }
}
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center p-4 sm:justify-end sm:p-6"
    aria-live="polite"
    @pointerenter="store.pause"
    @pointerleave="store.resume"
    @focusin="store.pause"
    @focusout="store.resume"
  >
    <TransitionGroup name="toast" tag="ol" class="relative flex w-full max-w-sm flex-col gap-2">
      <li
        v-for="toast in store.toasts"
        :key="toast.id"
        class="pointer-events-auto flex w-full items-center gap-3 rounded-2xl bg-fg py-3 pr-3 pl-4 text-sm text-bg shadow-lifted"
        :role="toast.tone === 'error' ? 'alert' : 'status'"
      >
        <CircleCheck
          v-if="toast.tone === 'success'"
          class="size-4 shrink-0 text-emerald-400 dark:text-emerald-600"
          aria-hidden="true"
        />
        <CircleAlert
          v-else-if="toast.tone === 'error'"
          class="size-4 shrink-0 text-rose-400 dark:text-rose-600"
          aria-hidden="true"
        />
        <Info v-else class="size-4 shrink-0" aria-hidden="true" />
        <span class="flex-1">{{ toast.message }}</span>
        <button
          v-if="toast.action"
          type="button"
          class="rounded-lg px-2 py-1 font-semibold transition hover:bg-bg/15"
          @click="run(toast)"
        >
          {{ toast.action.label }}
        </button>
        <button
          type="button"
          class="grid size-7 place-items-center rounded-lg opacity-60 transition hover:bg-bg/15 hover:opacity-100"
          aria-label="Dismiss"
          @click="store.dismiss(toast.id)"
        >
          <X class="size-4" aria-hidden="true" />
        </button>
      </li>
    </TransitionGroup>
  </div>
</template>
