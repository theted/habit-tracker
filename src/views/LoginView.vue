<template>
  <Box>
    <form @submit.prevent="login" class="flex flex-col space-y-4 p-6">
      <Text variant="title">Log in</Text>
      <TextField name="password" type="password" v-model="password" />
      <Text v-if="failed">Wrong password</Text>
      <Button type="submit" :loading="loading">Log in</Button>
    </form>
  </Box>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Box from '@/components/Box.vue'
import Button from '@/components/Button.vue'
import Text from '@/components/Text.vue'
import TextField from '@/components/TextField.vue'
import { checkPassword } from '@/api'
import { setPassword } from '@/auth'

const router = useRouter()
const password = ref('')
const failed = ref(false)
const loading = ref(false)

const login = async () => {
  loading.value = true
  failed.value = false
  const ok = await checkPassword(password.value).finally(() => (loading.value = false))
  if (!ok) {
    failed.value = true
    return
  }
  setPassword(password.value)
  router.push({ path: '/' })
}
</script>
