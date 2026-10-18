<script setup lang="ts">
import { Check, Copy, KeyRound, Trash2 } from '@lucide/vue'
import { format, formatDistanceToNow } from 'date-fns'
import { computed, onMounted, ref } from 'vue'
import { agentsApi } from '../../api/agents'
import { ApiError } from '../../api/client'
import { useToastStore } from '../../stores/toasts'
import type { ApiToken } from '../../types'
import ConfirmDialog from '../ConfirmDialog.vue'
import AppButton from '../ui/AppButton.vue'
import TextField from '../ui/TextField.vue'

// The keys AI agents connect to /mcp with, and the commands that connect Claude Code
const toasts = useToastStore()

const keys = ref<ApiToken[]>([])
const loaded = ref(false)
onMounted(async () => {
  try {
    keys.value = await agentsApi.tokens()
  } catch (err) {
    toasts.error(err, "Couldn't load your keys")
  } finally {
    loaded.value = true
  }
})

const name = ref('')
const nameError = ref<string>()
const creating = ref(false)
// The key just made: shown until dismissed, and never again
const created = ref<{ name: string; token: string }>()

const create = async () => {
  nameError.value = undefined
  if (!name.value.trim()) {
    nameError.value = 'Give the key a name'
    return
  }
  creating.value = true
  try {
    const { token, ...key } = await agentsApi.createToken(name.value)
    keys.value.push(key)
    created.value = { name: key.name, token }
    name.value = ''
  } catch (err) {
    if (err instanceof ApiError && err.issueFor('name')) nameError.value = err.issueFor('name')
    else toasts.error(err, "Couldn't create the key")
  } finally {
    creating.value = false
  }
}

const origin = window.location.origin
const connectCommand = computed(
  () =>
    `claude mcp add --transport http --scope user habits ${origin}/mcp ` +
    `--header "Authorization: Bearer ${created.value?.token}"`
)
const skillCommand =
  'mkdir -p ~/.claude/skills/report-moments && ' +
  `curl -fsSL ${origin}/skills/report-moments/SKILL.md -o ~/.claude/skills/report-moments/SKILL.md`

const copied = ref<string>()
const copy = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = text
    setTimeout(() => copied.value === text && (copied.value = undefined), 2000)
  } catch {
    toasts.show("Couldn't reach the clipboard; select the text and copy it instead", {
      tone: 'error'
    })
  }
}

// Kept after the dialog closes, so its title doesn't change while it fades out
const revoking = ref<ApiToken>()
const revokeOpen = ref(false)
const revokeBusy = ref(false)
const askRevoke = (key: ApiToken) => {
  revoking.value = key
  revokeOpen.value = true
}

const revoke = async () => {
  const key = revoking.value
  if (!key) return
  revokeBusy.value = true
  try {
    await agentsApi.revokeToken(key.id)
    keys.value = keys.value.filter((existing) => existing.id !== key.id)
    if (created.value?.name === key.name) created.value = undefined
    revokeOpen.value = false
    toasts.show(`${key.name} can't report any more`)
  } catch (err) {
    toasts.error(err, "Couldn't revoke the key")
  } finally {
    revokeBusy.value = false
  }
}

const used = (key: ApiToken) =>
  key.lastUsedAt
    ? `last used ${formatDistanceToNow(new Date(key.lastUsedAt), { addSuffix: true })}`
    : 'never used'

const code =
  'block w-full overflow-x-auto rounded-xl bg-surface-2 px-3.5 py-3 pr-12 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all'
</script>

<template>
  <div class="grid gap-5">
    <ul v-if="keys.length" class="grid gap-1" aria-label="Keys">
      <li
        v-for="key in keys"
        :key="key.id"
        class="flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-surface-2"
      >
        <KeyRound class="size-4 shrink-0 text-muted" aria-hidden="true" />
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium">{{ key.name }}</p>
          <p class="text-xs text-muted">
            Made {{ format(new Date(key.createdAt), 'd MMM yyyy') }}, {{ used(key) }}
          </p>
        </div>
        <AppButton
          variant="ghost"
          size="icon"
          class="hover:text-rose-600"
          :aria-label="`Revoke ${key.name}`"
          @click="askRevoke(key)"
        >
          <Trash2 aria-hidden="true" />
        </AppButton>
      </li>
    </ul>
    <p v-else-if="loaded" class="text-sm text-muted">No keys yet.</p>

    <form
      class="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start"
      novalidate
      @submit.prevent="create"
    >
      <TextField
        v-model="name"
        label="New key"
        placeholder="Claude Code on my laptop"
        :maxlength="60"
        :error="nameError"
      />
      <AppButton class="justify-self-start sm:mt-[26px]" type="submit" :loading="creating"
        >Create key</AppButton
      >
    </form>

    <Transition name="page">
      <div
        v-if="created"
        class="grid gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-4"
        data-new-key
      >
        <div>
          <p class="text-sm font-semibold">{{ created.name }} is ready</p>
          <p class="text-sm text-muted">
            Copy it now: the key isn't shown again. This connects Claude Code on that computer:
          </p>
        </div>
        <div class="relative">
          <code :class="code">{{ connectCommand }}</code>
          <button
            type="button"
            class="absolute top-2 right-2 grid size-8 place-items-center rounded-lg text-muted transition hover:bg-surface hover:text-fg"
            :aria-label="copied === connectCommand ? 'Copied' : 'Copy the command'"
            @click="copy(connectCommand)"
          >
            <Check v-if="copied === connectCommand" class="size-4" aria-hidden="true" />
            <Copy v-else class="size-4" aria-hidden="true" />
          </button>
        </div>
        <AppButton class="justify-self-start" size="sm" @click="created = undefined">
          Done
        </AppButton>
      </div>
    </Transition>

    <div class="grid gap-2">
      <p class="text-sm text-muted">
        The <strong class="font-medium text-fg">report-moments</strong> skill tells agents when and
        how to report. Install it for Claude Code with:
      </p>
      <div class="relative">
        <code :class="code">{{ skillCommand }}</code>
        <button
          type="button"
          class="absolute top-2 right-2 grid size-8 place-items-center rounded-lg text-muted transition hover:bg-surface hover:text-fg"
          :aria-label="copied === skillCommand ? 'Copied' : 'Copy the command'"
          @click="copy(skillCommand)"
        >
          <Check v-if="copied === skillCommand" class="size-4" aria-hidden="true" />
          <Copy v-else class="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>

    <ConfirmDialog
      v-model:open="revokeOpen"
      :title="`Revoke ${revoking?.name}?`"
      message="Agents using it can't report any more. The moments they already reported stay."
      confirm-label="Revoke key"
      :busy="revokeBusy"
      @confirm="revoke"
    />
  </div>
</template>
