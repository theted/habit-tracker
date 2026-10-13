<script setup lang="ts">
import AppButton from './ui/AppButton.vue'
import BaseDialog from './ui/BaseDialog.vue'

const open = defineModel<boolean>('open', { default: false })
const { title, message, confirmLabel, busy = false } = defineProps<{
  title: string
  message: string
  confirmLabel: string
  busy?: boolean
}>()
const emit = defineEmits<{ confirm: [] }>()
</script>

<template>
  <BaseDialog v-model:open="open" :title>
    <p class="text-sm text-muted">{{ message }}</p>
    <div class="mt-6 flex justify-end gap-2">
      <AppButton @click="open = false">Cancel</AppButton>
      <AppButton variant="danger" :loading="busy" @click="emit('confirm')">
        {{ confirmLabel }}
      </AppButton>
    </div>
  </BaseDialog>
</template>
