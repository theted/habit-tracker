<template>
  <div>
    <!-- <Debug :data="props" label="props" /> -->
    <Bar :data="chartData" :options="options" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Chart as ChartJS, Title, Tooltip, BarElement, CategoryScale, LinearScale } from 'chart.js'
import { Bar } from 'vue-chartjs'
import * as chartConfig from './chartConfig.ts'

const props = defineProps<{
  inputData: any
  labels: any
}>()

ChartJS.register(Title, Tooltip, BarElement, CategoryScale, LinearScale)

const chartData = ref(chartConfig.data)
const options = ref(chartConfig.options)

watch(props, (newProps) => {
  const newData = JSON.parse(JSON.stringify({ ...chartData.value }))
  newData.labels = Object.values(newProps.labels)
  newData.datasets[0].data = Object.values(newProps.inputData)
  chartData.value = newData
  chartConfig.data.labels = newProps.labels
})
</script>
