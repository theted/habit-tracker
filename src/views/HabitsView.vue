<template>
  <div>
    <div class="w-full flex gap-12 flex-wrap flex-row">
      <Habit
        v-for="habit in actualHabits"
        :key="habit.id"
        :habit="habit"
        :id="habit.id"
        :title="habit.title"
        :count="habit._count.tracks || 0"
        class="flex-auto"
      />
    </div>

    <div class="mt-12">
      <Button @click="showModal = true">Add habit</Button>
    </div>
  </div>

  <Modal :show="showModal" @update:show="showModal = $event">
    <slot>
      <HabitForm v-slot:default="{ closeModal }" :close-modal="closeModal" />
    </slot>
  </Modal>
</template>

<script setup lang="ts">
import Habit from '../components/Habit.vue'
import Button from '../components/Button.vue'
import Modal from '../components/Modal.vue'
import HabitForm from '../views/HabitForm.vue'
import { onMounted, ref } from 'vue'
import { getHabits } from '@/api'

const showModal = ref(false)
const actualHabits = ref()

const closeModal = () => {
  showModal.value = false
}

onMounted(async () => {
  const habits = await getHabits()
  actualHabits.value = habits.data
})
</script>
