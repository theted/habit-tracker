<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ApiError } from '../../api/client'
import { useSessionStore } from '../../stores/session'
import { useToastStore } from '../../stores/toasts'
import AppButton from '../ui/AppButton.vue'
import PasswordField from '../ui/PasswordField.vue'
import TextField from '../ui/TextField.vue'

const session = useSessionStore()
const toasts = useToastStore()

const form = reactive({ username: session.user?.username ?? '', currentPassword: '' })
const errors = reactive<{ username?: string; currentPassword?: string }>({})
const saving = ref(false)

const submit = async () => {
  Object.assign(errors, { username: undefined, currentPassword: undefined })
  if (!form.currentPassword) {
    errors.currentPassword = 'Enter your current password'
    return
  }
  saving.value = true
  try {
    await session.updateAccount({ username: form.username, currentPassword: form.currentPassword })
    form.currentPassword = ''
    toasts.show(`You're now ${session.user?.username}`)
  } catch (err) {
    if (err instanceof ApiError && err.issues.length) {
      errors.username = err.issueFor('username')
      errors.currentPassword = err.issueFor('currentPassword')
    } else {
      toasts.error(err, "Couldn't change the username")
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="grid gap-4" novalidate @submit.prevent="submit">
    <TextField
      v-model="form.username"
      label="Username"
      autocomplete="username"
      :maxlength="32"
      :error="errors.username"
    />
    <PasswordField
      v-model="form.currentPassword"
      label="Current password"
      autocomplete="current-password"
      :error="errors.currentPassword"
    />
    <AppButton
      class="justify-self-start"
      type="submit"
      :loading="saving"
      :disabled="form.username.trim().toLowerCase() === session.user?.username"
    >
      Change username
    </AppButton>
  </form>
</template>
