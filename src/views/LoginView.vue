<script setup lang="ts">
import { Check } from '@lucide/vue'
import { ref, useTemplateRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '../components/ui/AppButton.vue'
import TextField from '../components/ui/TextField.vue'
import { checkPassword } from '../api/client'
import { setPassword } from '../auth'

const router = useRouter()
const route = useRoute()

const password = ref('')
const error = ref<string>()
const loading = ref(false)
const card = useTemplateRef<HTMLElement>('card')

// Only paths inside the app, so ?next= can't send anyone elsewhere
const next = () => {
  const target = route.query.next
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')
    ? target
    : '/'
}

const shake = () => {
  card.value?.classList.remove('shake')
  void card.value?.offsetWidth
  card.value?.classList.add('shake')
}

const login = async () => {
  if (!password.value) {
    error.value = 'Enter the password'
    return
  }
  loading.value = true
  error.value = undefined
  try {
    if (await checkPassword(password.value)) {
      setPassword(password.value)
      await router.replace(next())
    } else {
      error.value = "That's not the password"
      shake()
    }
  } catch {
    error.value = "Couldn't reach the server"
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="grid min-h-dvh place-items-center px-4 py-12">
    <div
      ref="card"
      class="w-full max-w-sm rounded-3xl border border-line bg-surface p-8 shadow-lifted"
    >
      <span
        class="grid size-12 place-items-center rounded-2xl bg-linear-to-br from-violet-500 to-fuchsia-500 text-white shadow-card"
      >
        <Check class="size-6" :stroke-width="3" aria-hidden="true" />
      </span>
      <h1 class="mt-6 text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p class="mt-1 text-sm text-muted">Enter the password to see your habits.</p>
      <form class="mt-6 grid gap-4" novalidate @submit.prevent="login">
        <TextField
          v-model="password"
          label="Password"
          type="password"
          autocomplete="current-password"
          :error
        />
        <AppButton type="submit" variant="primary" :loading>Continue</AppButton>
      </form>
    </div>
  </div>
</template>
