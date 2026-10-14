<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError } from '../../api/client'
import { useSessionStore } from '../../stores/session'
import { useToastStore } from '../../stores/toasts'
import AppButton from '../ui/AppButton.vue'
import BaseDialog from '../ui/BaseDialog.vue'
import PasswordField from '../ui/PasswordField.vue'

const open = defineModel<boolean>('open', { default: false })

const session = useSessionStore()
const toasts = useToastStore()
const router = useRouter()

const password = ref('')
const error = ref<string>()
const deleting = ref(false)

watch(open, (isOpen) => {
  if (!isOpen) return
  password.value = ''
  error.value = undefined
})

const submit = async () => {
  if (!password.value) {
    error.value = 'Enter your password'
    return
  }
  deleting.value = true
  try {
    await session.deleteAccount(password.value)
    open.value = false
    toasts.show('Your account and everything in it are gone')
    await router.replace({ name: 'login' })
  } catch (err) {
    if (err instanceof ApiError && err.issueFor('password')) error.value = err.issueFor('password')
    else toasts.error(err, "Couldn't delete the account")
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <BaseDialog
    v-model:open="open"
    title="Delete your account?"
    description="Your habits and every entry go with it. This can't be undone."
  >
    <form class="grid gap-5" novalidate @submit.prevent="submit">
      <PasswordField
        v-model="password"
        label="Your password"
        autocomplete="current-password"
        :error
      />
      <div class="flex justify-end gap-2">
        <AppButton @click="open = false">Cancel</AppButton>
        <AppButton type="submit" variant="danger" :loading="deleting">Delete account</AppButton>
      </div>
    </form>
  </BaseDialog>
</template>
