<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ApiError } from '../../api/client'
import { useSessionStore } from '../../stores/session'
import { useToastStore } from '../../stores/toasts'
import AppButton from '../ui/AppButton.vue'
import PasswordField from '../ui/PasswordField.vue'

const session = useSessionStore()
const toasts = useToastStore()

const form = reactive({ currentPassword: '', newPassword: '' })
const errors = reactive<{ currentPassword?: string; newPassword?: string }>({})
const saving = ref(false)

const submit = async () => {
  Object.assign(errors, { currentPassword: undefined, newPassword: undefined })
  if (!form.currentPassword) errors.currentPassword = 'Enter your current password'
  if (!form.newPassword) errors.newPassword = 'Enter a new password'
  if (errors.currentPassword || errors.newPassword) return

  saving.value = true
  try {
    await session.updateAccount({ ...form })
    Object.assign(form, { currentPassword: '', newPassword: '' })
    toasts.show('Password changed. Other devices have been logged out.')
  } catch (err) {
    if (err instanceof ApiError && err.issues.length) {
      errors.currentPassword = err.issueFor('currentPassword')
      errors.newPassword = err.issueFor('newPassword')
    } else {
      toasts.error(err, "Couldn't change the password")
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="grid gap-4" novalidate @submit.prevent="submit">
    <!-- Lets password managers tie the new password to the right account -->
    <input
      type="text"
      name="username"
      autocomplete="username"
      :value="session.user?.username"
      hidden
      readonly
    />
    <PasswordField
      v-model="form.currentPassword"
      label="Current password"
      autocomplete="current-password"
      :error="errors.currentPassword"
    />
    <PasswordField
      v-model="form.newPassword"
      label="New password"
      autocomplete="new-password"
      hint="At least 8 characters. A short sentence works well."
      :error="errors.newPassword"
    />
    <AppButton class="justify-self-start" type="submit" :loading="saving">
      Change password
    </AppButton>
  </form>
</template>
