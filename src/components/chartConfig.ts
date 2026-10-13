import type { ChartData } from 'chart.js'
import { getGradient } from '@/helpers/getGradient'

export const data: ChartData<'bar'> = {
  labels: [],
  datasets: [
    {
      data: [],
      backgroundColor: function (context) {
        const { ctx, chartArea } = context.chart

        if (!chartArea) return

        return getGradient(ctx, chartArea)
      }
    }
  ]
}

export const options = {
  responsive: true,
  maintainAspectRatio: true,
  barPercentage: 1.0,
  categoryPercentage: 1.0,
  scales: {
    x: {
      display: false
    },
    y: {
      display: false
    }
  }
}
