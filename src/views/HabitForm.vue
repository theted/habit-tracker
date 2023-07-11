<template v-slot:default="{ closeModal }">
  <div class="">
    <Text variant="title">New habit</Text>
    <form @submit.prevent="submitForm" class="flex flex-col space-y-4">
      <TextField name="title" v-model="form.title" required />
      <CheckBox name="checkbox" v-model="checked" />
      <TextField name="target" type="number" v-if="checked" v-model="form.target" required />

      <Layout>
        <Button @click="submitForm">Save</Button>
        <Button variant="error" @click="closeModal">Close</Button>
      </Layout>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Text from '@/components/Text.vue'
import TextField from '@/components/TextField.vue'
import CheckBox from '@/components/CheckBox.vue'
import Button from '../components/Button.vue'
import Layout from '../components/Layout.vue'
import { createHabit } from '@/api'

const checked = ref(false)

const form = ref({
  title: '',
  target: 0
})

defineProps({
  closeModal: {
    type: Function,
    required: true
  }
})

const submitForm = async () => {
  const result = await createHabit({
    // bit of a hack for now
    userId: 1,
    ...form.value
  })
  console.log({ result })

  // closeModal()
}
</script>
