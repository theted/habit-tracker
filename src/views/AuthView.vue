<script setup lang="ts">
import { Check } from '@lucide/vue'
import { computed, reactive, ref, useTemplateRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError } from '../api/client'
import AppButton from '../components/ui/AppButton.vue'
import PasswordField from '../components/ui/PasswordField.vue'
import TextField from '../components/ui/TextField.vue'
import { useSessionStore } from '../stores/session'

const session = useSessionStore()
const router = useRouter()
const route = useRoute()

const mode = ref<'login' | 'register'>('login')
const registering = computed(() => mode.value === 'register')

const form = reactive({ username: '', password: '' })
const errors = reactive<{ username?: string; password?: string; form?: string }>({})
const loading = ref(false)
const card = useTemplateRef<HTMLElement>('card')

watch(mode, () =>
  Object.assign(errors, { username: undefined, password: undefined, form: undefined })
)

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

const submit = async () => {
  Object.assign(errors, { username: undefined, password: undefined, form: undefined })
  if (!form.username.trim()) errors.username = 'Enter a username'
  if (!form.password) errors.password = 'Enter a password'
  if (errors.username || errors.password) return

  loading.value = true
  try {
    if (registering.value) await session.register(form.username, form.password)
    else await session.login(form.username, form.password)
    await router.replace(next())
  } catch (err) {
    if (err instanceof ApiError && err.issues.length) {
      errors.username = err.issueFor('username')
      errors.password = err.issueFor('password')
    } else {
      errors.form =
        err instanceof ApiError ? err.message : "Couldn't reach the server. Try again in a moment."
    }
    shake()
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
      <Transition name="page" mode="out-in">
        <div :key="mode">
          <h1 class="mt-6 text-2xl font-semibold tracking-tight">
            {{ registering ? 'Create your account' : 'Welcome back' }}
          </h1>
          <p class="mt-1 text-sm text-muted">
            {{
              registering
                ? 'Keep count of your habits, good and bad.'
                : 'Log in to see your habits.'
            }}
          </p>
        </div>
      </Transition>

      <form class="mt-6 grid gap-4" novalidate @submit.prevent="submit">
        <TextField
          v-model="form.username"
          label="Username"
          autocomplete="username"
          :maxlength="32"
          :error="errors.username"
          :hint="registering ? 'Letters, digits, dots, dashes and underscores' : undefined"
        />
        <PasswordField
          v-model="form.password"
          label="Password"
          :autocomplete="registering ? 'new-password' : 'current-password'"
          :error="errors.password"
          :hint="registering ? 'At least 8 characters. A short sentence works well.' : undefined"
        />
        <p
          v-if="errors.form"
          class="rounded-xl bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-700 dark:text-rose-300"
          role="alert"
        >
          {{ errors.form }}
        </p>
        <AppButton type="submit" variant="primary" :loading>
          {{ registering ? 'Create account' : 'Log in' }}
        </AppButton>
      </form>

      <p v-if="session.signupEnabled || registering" class="mt-6 text-center text-sm text-muted">
        {{ registering ? 'Already have an account?' : 'New here?' }}
        <button
          type="button"
          class="font-medium text-fg underline-offset-4 hover:underline"
          @click="mode = registering ? 'login' : 'register'"
        >
          {{ registering ? 'Log in' : 'Create an account' }}
        </button>
      </p>
    </div>
  </div>
</template>
