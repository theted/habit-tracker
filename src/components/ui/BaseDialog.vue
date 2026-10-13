<script setup lang="ts">
import { onMounted, useId, useTemplateRef, watch } from 'vue'

// A native <dialog> shown modally: focus trapping, Escape and the top layer come from the
// browser. The open/close animation is CSS (dialog.sheet in style.css).
const open = defineModel<boolean>('open', { default: false })
const { title, description } = defineProps<{ title: string; description?: string }>()

const dialog = useTemplateRef<HTMLDialogElement>('dialog')
const titleId = useId()

const sync = () => {
  const element = dialog.value
  if (!element) return
  if (open.value && !element.open) element.showModal()
  else if (!open.value && element.open) element.close()
}
watch(open, sync, { flush: 'post' })
onMounted(sync)

// A click that lands on the <dialog> itself rather than its content is on the backdrop
const onClick = (event: MouseEvent) => {
  if (event.target === dialog.value) open.value = false
}
</script>

<template>
  <dialog
    ref="dialog"
    class="sheet m-auto max-h-[calc(100dvh-2rem)] w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 text-fg shadow-lifted"
    :aria-labelledby="titleId"
    @close="open = false"
    @click="onClick"
  >
    <div class="p-6">
      <header class="mb-5">
        <h2 :id="titleId" class="text-lg font-semibold tracking-tight">{{ title }}</h2>
        <p v-if="description" class="mt-1 text-sm text-muted">{{ description }}</p>
      </header>
      <slot />
    </div>
  </dialog>
</template>
