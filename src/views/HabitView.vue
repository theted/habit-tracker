<template>
  <Box>
    <div class="p-3 border-b border-gray-300">
      <Text variant="title">{{ title }}</Text>
    </div>

    <div class="p-6 border-b border-gray-200">
      <Layout>
        <Select name="interval" :options="intervals" v-model="selectedValue" default-value="hour" />
        <Layout class="self-end" :columns="3">
          <Button @click="console.log('add!')" variant="success">Add</Button>
          <Button @click="console.log('edit!')">Edit</Button>
          <Button @click="deleteHabitCallback()" variant="danger">Delete</Button>
        </Layout>
      </Layout>
    </div>
    <Chart :input-data="habitData" :labels="labels" />
  </Box>
</template>

<script setup lang="ts">
import Box from '@/components/Box.vue'
import Layout from '@/components/Layout.vue'
import Text from '@/components/Text.vue'
import Button from '@/components/Button.vue'
import Select from '@/components/Select.vue'
import Chart from '@/components/Chart.vue'
import { onMounted, ref, watch } from 'vue'
import { deleteHabit, getHabit } from '@/api'
import { intervals, Days, Months } from '@/enums'
import { calculateDates } from '@/helpers/date'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const { id } = route.params

const title = ref()
const dates = ref([])
const labels = ref([])
const sortData = ref({})
const habitData = ref([])
const actualHabits = ref()
const selectedValue = ref('')

const hourLabel = new Array(24).fill(0).map((_, i) => i)
const weekLabel = Object.values(Days).filter((v) => isNaN(Number(v)))
const dayOfMonthLabel = new Array(31).fill(0).map((_, i) => i)
const monthLabel = Object.values(Months).filter((v) => isNaN(Number(v)))

const setSelect = (interval: string) => {
  switch (interval) {
    case 'hour':
      habitData.value = sortData.value.occurrencesByHour
      labels.value = hourLabel
      break
    case 'dayOfWeek':
      habitData.value = sortData.value.occurrencesByDayOfWeek
      labels.value = weekLabel
      break
    case 'dayOfMonth':
      habitData.value = sortData.value.occurrencesByDayOfMonth
      labels.value = dayOfMonthLabel
      break
    case 'month':
      habitData.value = sortData.value.occurrencesByMonth
      labels.value = monthLabel
      break
  }
}

const deleteHabitCallback = async () => {
  if (confirm('Are you sure you want to delete this habit?')) {
    const res = await deleteHabit(id)
    console.log({ res })
    router.push({ path: '/' })
  }
}

onMounted(async () => {
  const habit = await getHabit(id)
  const trackDates = habit.data.tracks.map((track) => track.date)

  actualHabits.value = habit.data
  title.value = habit.data.title
  dates.value = trackDates
  sortData.value = calculateDates(trackDates)

  setSelect('hour')
})

watch(selectedValue, (newVal) => setSelect(newVal))
</script>
